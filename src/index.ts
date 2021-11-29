import download from "download";
import path from "path";

const basePath = path.join(__dirname, "../binaries");
const channel = "all_commits";//all_commits  || master
const versions = [
  "adf5e8cba3daf12d456d911d72b6e9418681b28b",
  "b8c35d44de987a9691890b3ddf3e2e7effb9bf20",
  "78a5df6def6943431f4c022e1428dbc3e833cf8e",
];
const platforms = [
  "native",
  "darwin",
  "darwin-arm64",
  "debian-openssl-1.0.x",
  "debian-openssl-1.1.x",
  "rhel-openssl-1.0.x",
  "rhel-openssl-1.1.x",
  "linux-arm64-openssl-1.1.x",
  "linux-arm64-openssl-1.0.x",
  "linux-arm-openssl-1.1.x",
  "linux-arm-openssl-1.0.x",
  "linux-musl",
  "linux-nixos",
  "windows",
  "freebsd11",
  "freebsd12",
  "openbsd",
  "netbsd",
  "arm",
];
const binaryNames: string[] = [
  "introspection-engine",
  "query-engine",
  "libquery-engine",
  "libquery-engine-napi",
  "migration-engine",
  "prisma-fmt",
];
const urlInfo: {
  url: string;
  urlFileSha256: string;
  urlSha256: string;
  filePath: string;
  fileName: string;
}[] = [];
const baseUrl = "https://binaries.prisma.sh";
versions.forEach((version) => {
  platforms.forEach((platform) => {
    binaryNames.forEach((binaryName) => {
      const finalExtension =
        platform === "windows" && "libquery-engine" !== binaryName
          ? `.exe.gz`
          : ".gz";

      /* if (binaryName === 'libquery-engine') {
            return `${getNodeAPIName(platform, 'url')}`
          }
          const extension = platform === 'windows' ? '.exe' : ''
          return `${binaryName}-${platform}${extension}` */

      const url = `${baseUrl}/${channel}/${version}/${platform}/${binaryName}${finalExtension}`;
      const urlFileSha256 = `${baseUrl}/${channel}/${version}/${platform}/${binaryName}.sha256`;
      const urlSha256 = `${baseUrl}/${channel}/${version}/${platform}/${binaryName}${finalExtension}.sha256`;
      const filePath = `${basePath}/${channel}/${version}/${platform}`;

      urlInfo.push({
        url,
        urlFileSha256,
        urlSha256,
        filePath,
        fileName: `${binaryName}${finalExtension}`,
      });
    });
  });
});

// `${baseUrl}/${channel}/${version}/${platform}/${binaryName}${finalExtension}`

(async () => {
  await urlInfo.forEach(async (info) => {
    console.info("download: ", info.url);
    try {
      await download(info.urlFileSha256, info.filePath);
    } catch (error: any) {
      console.error(
        `Failure Download ${info.urlFileSha256} : ${error.message}`
      );
      //errArry.push({ message: `Failure Download ${info.urlFileSha256} : ${error.message}`, error });
    }
    try {
      await download(info.urlSha256, info.filePath);
    } catch (error: any) {
      console.error(`Failure Download ${info.urlSha256} : ${error.message}`);
    }

    try {
      await download(info.url, info.filePath);
      //console.info(`Completed! Saved ${info.filePath}/${info.fileName}`);
    } catch (error: any) {
      console.error(`Failure Download ${info.url} : ${error.message}`);
    }
  });
})();
