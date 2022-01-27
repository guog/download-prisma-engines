# 下载Prisma二进制文件

本项目是为了解决开发环境无法访问`https://binaries.prisma.sh`的问题.

比如在公司内网中,或国内访问Amazon S3服务器巨慢,通过自己搭建Prisma引擎文件服务器而解决此问题.

1. 在能流畅访问`https://binaries.prisma.sh`的网络环境中,下载好指定版本的Prisma引擎文件,
2. 将第1步中下的文件,自行搭建文件服务器,如`http://172.21.33.10:10000/prisma`;
3. 安装prisma引擎文件时(如`npm install`或`yarn install`)前,修改环境变量值,将默认的`https://binaries.prisma.sh`替换为第2步搭建的服务器地址,即`http://172.21.33.10:10000/prisma`.

使用的环境变量为:

- `PRISMA_ENGINES_MIRROR`
- `PRISMA_BINARIES_MIRROR`

可参见Prism官方文档——[Downloading Engines](https://www.prisma.io/docs/reference/api-reference/environment-variables-reference#downloading-engines)

## 分支说明

- 2.23.0 用于下载prisma 2.23.0相关二进制文件
- 2.30.3 用于下载prisma 2.30.3 和prisma 3.x相关二进制文件
- 3.6.0 用于下载prisma 3.6.0及其后续版本
- master 用于下载prisma 3.6.0及其后续版本

## 使用

```bash
# 安装依赖
yarn
# 编译
yarn build
# 运行
yarn start
```

可根据需要修改`src/index.ts`相关代码.

注意

> - `version`请查看具体项目中`node_modules/@prisma/engines-version/package.json`文件中`enginesVersion`值,此值表明了prisma engine的具体版本
> - 低于2.30.x的版本请切换到2.30.0分支

```js
const options: DownloadOptions = {
  binaries: {
    [BinaryType.queryEngine]: binaryDir,
    [BinaryType.libqueryEngine]: binaryDir, //  3.x
    //[BinaryType.libqueryEngineNapi]:binaryDir, // 2.x
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
  version: "dc520b92b1ebb2d28dc3161f9f82e875bd35d727",
  ignoreCache: true,
};
```

注意: `master`分支中,`version`改为从依赖自动获取——即下载的prisma版本决定于本项目`package.json`文件中`@prisma/engines-version`内容,可以使用`yarn upgrade-interactive --latest`命令或手动修改此依赖的版本号

## 实际场景使用

将下载的`downloads/all_commits`目录及其所有文件,放到特定目录并使用Nginx等搭建HTTP服务,如:`http://172.21.33.10:10000/prisma`

使用环境变量`[PRISMA_ENGINES_MIRROR](https://www.prisma.io/docs/reference/api-reference/environment-variables-reference#prisma_engines_mirror)`指定Prisma CLI/Client 的CDN,其默认为:`https://binaries.prisma.sh`.

注意

> Prisma 3.0.1 之前的版本使用`PRISMA_BINARIES_MIRROR`(或`PRISMA_BINARY_MIRROR`官方文档错误)指定CDN.

## 安装依赖

安装依赖前指定Prisma二进制文件下载的CDN为`http://172.21.33.10:10000/prisma`

```sh
PRISMA_ENGINES_MIRROR=http://172.21.33.10:10000/prisma yarn install
```

## 指定CDN和目标平台安装Prisma CLI

```sh
PRISMA_ENGINES_MIRROR=http://172.21.33.10:10000/prisma PRISMA_CLI_BINARY_TARGETS=darwin,linux-musl,windows,rhel-openssl-1.0.x yarn install
```

详情参见[`binaryTargets options`](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options).

PRISMA_CLI_BINARY_TARGETS常用的目标平台有:

- darwin : MacOS
- linux-musl : Apline
- windows : Windows
- debian-openssl-1.0.x : Debian 发行版 OpenSSL 1.0.x
- debian-openssl-1.1.x : Debian 发行版 OpenSSL 1.1.x
- rhel-openssl-1.0.x : CentOS 发行版 OpenSSL 1.0.x
- rhel-openssl-1.1.x : CentOS 发行版 OpenSSL 1.1.x
