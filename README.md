# 下载Prisma二进制文件

## 分支说明

- 2.23.0 用于下载prisma 2.23.0相关二进制文件
- 2.30.3 用于下载prisma 2.30.3 和prisma 3.x相关二进制文件

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
