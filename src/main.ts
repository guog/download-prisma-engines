import Debug from "@prisma/debug";
import {
  BinaryPaths,
  BinaryType,
  checkVersionCommand,
  DownloadOptions,
  getBinaryEnvVarPath,
  getBinaryName,
  maybeCopyToTmp,
} from "@prisma/fetch-engine";
import fetch from "node-fetch";
import { flatMap } from "@prisma/fetch-engine/dist/flatMap";
import { getHash } from "@prisma/fetch-engine/dist/getHash";
import { cleanupCache } from "@prisma/fetch-engine/dist/cleanupCache";
import { getCacheDir, getDownloadUrl } from "@prisma/fetch-engine/dist/util";
import { getBar } from "@prisma/fetch-engine/dist/log";
import {
  getNodeAPIName,
  getos,
  getPlatform,
  isNodeAPISupported,
  Platform,
  platforms,
} from "@prisma/get-platform";
import chalk from "chalk";
import fs from "fs";
import pFilter from "p-filter";
import path from "path";
import { promisify } from "util";
import makeDir from "make-dir";
import download from "download";
const debug = Debug("prisma:download");
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const readFile = promisify(fs.readFile);
const copyFile = promisify(fs.copyFile);
const utimes = promisify(fs.utimes);

const binaryDir = path.join(__dirname, "../download/");
const lockFile = path.join(binaryDir, "download-lock");

const channel = "master";
const options: DownloadOptions = {
  binaries: {
    [BinaryType.queryEngine]: binaryDir,
    [BinaryType.libqueryEngine]: binaryDir,
    [BinaryType.migrationEngine]: binaryDir,
    [BinaryType.introspectionEngine]: binaryDir,
    [BinaryType.prismaFmt]: binaryDir,
  },
  binaryTargets: [
    "darwin",
    "linux-musl",
    "windows",
    "debian-openssl-1.0.x",
    "debian-openssl-1.1.x",
    "rhel-openssl-1.0.x",
    "rhel-openssl-1.1.x",
  ],
  version: "78a5df6def6943431f4c022e1428dbc3e833cf8e",
  ignoreCache: true,
};

async function main() {
  // get platform
  const platform = await getPlatform();
  const os = await getos();

  if (os.distro && ["nixos"].includes(os.distro)) {
    console.error(
      `${chalk.yellow("Warning")} Precompiled binaries are not available for ${
        os.distro
      }.`
    );
  } else if (
    ["freebsd11", "freebsd12", "openbsd", "netbsd"].includes(platform)
  ) {
    console.error(
      `${chalk.yellow(
        "Warning"
      )} Precompiled binaries are not available for ${platform}. Read more about building your own binaries at https://pris.ly/d/build-binaries`
    );
  } else if (BinaryType.libqueryEngine in options.binaries) {
    await isNodeAPISupported();
  }

  // no need to do anything, if there are no binaries
  if (!options.binaries || Object.values(options.binaries).length === 0) {
    return {};
  }

  const opts = {
    ...options,
    binaryTargets: options.binaryTargets ?? [
      "darwin",
      "linux-musl",
      "windows",
      "debian-openssl-1.0.x",
      "debian-openssl-1.1.x",
      "rhel-openssl-1.0.x",
      "rhel-openssl-1.1.x",
    ],
    version: options.version ?? "latest",
  };

  const binaryJobs = flatMap(
    Object.entries(opts.binaries),
    ([binaryName, targetFolder]: [string, string]) =>
      opts.binaryTargets.map((binaryTarget) => {
        const fileName =
          binaryName === BinaryType.libqueryEngine
            ? getNodeAPIName(binaryTarget, "fs")
            : getBinaryName(binaryName, binaryTarget);
        const targetFilePath = path.join(targetFolder, fileName);
        return {
          binaryName,
          targetFolder,
          binaryTarget,
          fileName,
          targetFilePath,
          envVarPath: getBinaryEnvVarPath(binaryName),
        };
      })
  );

  console.log(`version: ${opts.version}`);

  // filter out files, which don't yet exist or have to be created
  const binariesToDownload = await pFilter(binaryJobs, async (job) => {
    const needsToBeDownloaded = await binaryNeedsToBeDownloaded(
      job,
      platform,
      opts.version,
      opts.failSilent
    );
    const isSupported = platforms.includes(job.binaryTarget as Platform);
    const shouldDownload =
      isSupported &&
      !job.envVarPath &&
      (opts.ignoreCache || needsToBeDownloaded);
    if (needsToBeDownloaded && !isSupported) {
      throw new Error(
        `Unknown binaryTarget ${job.binaryTarget} and no custom binaries were provided`
      );
    }
    return shouldDownload;
  });

  if (binariesToDownload.length > 0) {
    const cleanupPromise = cleanupCache(); // already start cleaning up while we download

    let finishBar: undefined | (() => void);
    let setProgress:
      | undefined
      | ((sourcePath: string) => (progress: number) => void);

    if (opts.showProgress) {
      const collectiveBar = getCollectiveBar(opts);
      finishBar = collectiveBar.finishBar;
      setProgress = collectiveBar.setProgress;
    }

    // Node 14 for whatever reason can't handle concurrent writes
    await Promise.all(
      binariesToDownload.map((job) =>
        downloadBinary({
          ...job,
          version: opts.version,
          failSilent: opts.failSilent,
          progressCb: setProgress ? setProgress(job.targetFilePath) : undefined,
        })
      )
    );

    await cleanupPromise; // make sure, that cleanup finished
    if (finishBar) {
      finishBar();
    }
  }

  const binaryPaths = binaryJobsToBinaryPaths(binaryJobs);
  const dir = eval("__dirname");

  // this is necessary for pkg
  if (dir.startsWith("/snapshot/")) {
    for (const engineType in binaryPaths) {
      const binaryTargets = binaryPaths[engineType];
      for (const binaryTarget in binaryTargets) {
        const binaryPath = binaryTargets[binaryTarget];
        binaryTargets[binaryTarget] = await maybeCopyToTmp(binaryPath);
      }
    }
  }

  return binaryPaths;
}
/* function getCliQueryEngineBinaryType():
  | BinaryType.libqueryEngine
  | BinaryType.queryEngine {
  const envCliQueryEngineType = process.env.PRISMA_CLI_QUERY_ENGINE_TYPE
  if (envCliQueryEngineType) {
    if (envCliQueryEngineType === 'binary') {
      return BinaryType.queryEngine
    }
    if (envCliQueryEngineType === 'library') {
      return BinaryType.libqueryEngine
    }
  }
  return BinaryType.libqueryEngine
} */

type DownloadBinaryOptions = BinaryDownloadJob & {
  version: string;
  progressCb?: (progress: number) => void;
  failSilent?: boolean;
};

async function downloadBinary(options: DownloadBinaryOptions): Promise<void> {
  const { version, progressCb, targetFilePath, binaryTarget, binaryName } =
    options;
  const downloadUrl = getDownloadUrl(
    "all_commits",
    version,
    binaryTarget,
    binaryName
  );
  const baseUrl = "https://binaries.prisma.sh/";
  console.info(`URL: ${downloadUrl}`);

  const targetDir = path.dirname(
    path.join(
      __dirname,
      "../",
      downloadUrl.replace("https://binaries.prisma.sh/", "downloads/")
    )
  );

  await download(downloadUrl, targetDir);
  /* const targetDir = path.dirname(targetFilePath);

  try {
    fs.accessSync(targetDir, fs.constants.W_OK);
    await makeDir(targetDir);
  } catch (e) {
    if (options.failSilent || (e as NodeJS.ErrnoException).code !== "EACCES") {
      return;
    } else {
      throw new Error(
        `Can't write to ${targetDir} please make sure you install "prisma" with the right permissions.`
      );
    }
  }

  debug(`Downloading ${downloadUrl} to ${targetFilePath}`);

  if (progressCb) {
    progressCb(0);
  }

  const { sha256, zippedSha256 } = await downloadZip(
    downloadUrl,
    targetFilePath,
    progressCb
  );
  if (progressCb) {
    progressCb(1);
  }

  if (process.platform !== "win32") {
    plusxSync(targetFilePath);
  }

  // Cache result
  await saveFileToCache(options, version, sha256, zippedSha256); */
}

async function getCommits(
  branch: string = "master"
): Promise<string[] | object> {
  const url = `https://github-cache.prisma.workers.dev/repos/prisma/prisma-engines/commits?sha=${branch}`;
  const result = await fetch(url).then((res) => res.json());

  if (!Array.isArray(result)) {
    return result as any;
  }

  const commits = result.map((r) => r.sha);
  return commits;
}

type BinaryDownloadJob = {
  binaryName: string;
  targetFolder: string;
  binaryTarget: Platform;
  fileName: string;
  targetFilePath: string;
  envVarPath: string | null;
};

async function binaryNeedsToBeDownloaded(
  job: BinaryDownloadJob,
  nativePlatform: string,
  version: string,
  failSilent?: boolean
): Promise<boolean> {
  // If there is an ENV Override and the file exists then it does not need to be downloaded
  if (job.envVarPath && fs.existsSync(job.envVarPath)) {
    return false;
  }
  // 1. Check if file exists
  const targetExists = await exists(job.targetFilePath);
  // 2. If exists, check, if cached file exists and is up to date and has same hash as file.
  // If not, copy cached file over
  const cachedFile = await getCachedBinaryPath({
    ...job,
    version,
    failSilent,
  });

  if (cachedFile) {
    const sha256FilePath = cachedFile + ".sha256";
    if (await exists(sha256FilePath)) {
      const sha256File = await readFile(sha256FilePath, "utf-8");
      const sha256Cache = await getHash(cachedFile);
      if (sha256File === sha256Cache) {
        if (!targetExists) {
          debug(`copying ${cachedFile} to ${job.targetFilePath}`);

          // TODO Remove when https://github.com/docker/for-linux/issues/1015 is fixed
          // Workaround for https://github.com/prisma/prisma/issues/7037
          await utimes(cachedFile, new Date(), new Date());

          await copyFile(cachedFile, job.targetFilePath);
        }
        const targetSha256 = await getHash(job.targetFilePath);
        if (sha256File !== targetSha256) {
          debug(
            `overwriting ${job.targetFilePath} with ${cachedFile} as hashes do not match`
          );
          await copyFile(cachedFile, job.targetFilePath);
        }
        return false;
      } else {
        return true;
      }
    } else {
      return true;
    }
  }

  // If there is no cache and the file doesn't exist, we for sure need to download it
  if (!targetExists) {
    debug(`file ${job.targetFilePath} does not exist and must be downloaded`);
    return true;
  }

  // 3. If same platform, always check --version
  if (
    job.binaryTarget === nativePlatform &&
    job.binaryName !== BinaryType.libqueryEngine
  ) {
    const works = await checkVersionCommand(job.targetFilePath);
    return !works;
  }

  return false;
}

type GetCachedBinaryOptions = BinaryDownloadJob & {
  version: string;
  failSilent?: boolean;
};
async function getCachedBinaryPath({
  version,
  binaryTarget,
  binaryName,
}: GetCachedBinaryOptions): Promise<string | null> {
  const cacheDir = await getCacheDir(channel, version, binaryTarget);
  if (!cacheDir) {
    return null;
  }

  const cachedTargetPath = path.join(cacheDir, binaryName);

  if (!fs.existsSync(cachedTargetPath)) {
    return null;
  }

  // All versions not called 'latest' are unique
  // only latest needs more checks
  if (version !== "latest") {
    return cachedTargetPath;
  }

  if (await exists(cachedTargetPath)) {
    return cachedTargetPath;
  }

  return null;
}

function getCollectiveBar(options: DownloadOptions): {
  finishBar: () => void;
  setProgress: (sourcePath: string) => (progress: number) => void;
} {
  const hasNodeAPI = "libquery-engine" in options.binaries;
  const bar = getBar(
    `Downloading Prisma engines${
      hasNodeAPI ? " for Node-API" : ""
    } for ${options.binaryTargets?.map((p) => chalk.bold(p)).join(" and ")}`
  );

  const progressMap: { [key: string]: number } = {};
  // Object.values is faster than Object.keys
  const numDownloads =
    Object.values(options.binaries).length *
    Object.values(options?.binaryTargets ?? []).length;
  const setProgress =
    (sourcePath: string) =>
    (progress): void => {
      progressMap[sourcePath] = progress;
      const progressValues = Object.values(progressMap);
      const totalProgress =
        progressValues.reduce((acc, curr) => {
          return acc + curr;
        }, 0) / numDownloads;
      if (options.progressCb) {
        options.progressCb(totalProgress);
      }
      if (bar) {
        bar.update(totalProgress);
      }
    };

  return {
    setProgress,
    finishBar: (): void => {
      bar.update(1);
      bar.terminate();
    },
  };
}

function binaryJobsToBinaryPaths(jobs: BinaryDownloadJob[]): BinaryPaths {
  return jobs.reduce<BinaryPaths>((acc, job) => {
    if (!acc[job.binaryName]) {
      acc[job.binaryName] = {};
    }

    // if an env var path has been provided, prefer that one
    acc[job.binaryName][job.binaryTarget] =
      job.envVarPath || job.targetFilePath;

    return acc;
  }, {} as BinaryPaths);
}

let createdLockFile = false;

function createLockFile() {
  createdLockFile = true;
  fs.writeFileSync(lockFile, Date.now().toString());
}

function cleanupLockFile() {
  if (createdLockFile) {
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (e) {
      debug(e);
    }
  }
}

main().catch((e) => debug(e));

// if we are in a Now context, ensure that `prisma generate` is in the postinstall hook
process.on("beforeExit", () => {
  cleanupLockFile();
});

process.once("SIGINT", () => {
  cleanupLockFile();
  process.exit();
});
