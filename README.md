# 下载Prisma二进制文件

本项目是为了解决开发环境无法访问 `https://binaries.prisma.sh`的问题.

比如在公司内网中,或国内访问Amazon S3服务器巨慢,通过自己搭建Prisma引擎文件服务器而解决此问题.

1. 在能流畅访问 `https://binaries.prisma.sh`的网络环境中,下载好指定版本的Prisma引擎文件,
2. 将第1步中下的文件,自行搭建文件服务器,如 `http://172.21.33.10:10000/prisma`;
3. 安装prisma引擎文件时(如 `npm install`或 `yarn install`)前,修改环境变量值,将默认的 `https://binaries.prisma.sh`替换为第2步搭建的服务器地址,即 `http://172.21.33.10:10000/prisma`.

## 使用方法

### 修改Prisma版本对应的Commit标记

修改 `download-prisma-engines.sh` 中 `commit`标记值，

例如当前 `5.20.0` 版本中的commmit值为 `06fc58a368dc7be9fbbbe894adf8d445d208c284` ，如下所示：

```json
  "dependencies": {
    "@prisma/debug": "workspace:*",
    "@prisma/engines-version": "5.20.0-12.06fc58a368dc7be9fbbbe894adf8d445d208c284",
    "@prisma/get-platform": "workspace:*"
  }
```

如上第三行中 `@prisma/engines-version`的版本为 `5.20.0-12.06fc58a368dc7be9fbbbe894adf8d445d208c284`，从最后一个 `.`后开始为其commit值

详情参见 https://github.com/prisma/prisma/blob/7a5c9657e39a2dcdc828ec9b2b3623ecaaaac30c/packages/fetch-engine/package.json#L46

### 运行

> 注意，需要wget

执行以下命令，在当前目录会创建 `-/binary/prisma/all_commits/06fc58a368dc7be9fbbbe894adf8d445d208c284`，下载的文件在此目录中。

```shell
chmod +x ./download-prisma-engines.sh
./download-prisma-engines.sh
```
