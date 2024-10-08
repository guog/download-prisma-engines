# 下载Prisma二进制文件

本项目是为了解决开发环境无法访问 `https://binaries.prisma.sh`的问题.

比如在公司内网中,或国内访问Amazon S3服务器巨慢,通过自己搭建Prisma引擎文件服务器而解决此问题.

1. 在能流畅访问 `https://binaries.prisma.sh`的网络环境中,下载好指定版本的Prisma引擎文件,
2. 将第1步中下的文件,自行搭建文件服务器,如 `http://172.21.33.10:10000/prisma`;
3. 安装prisma引擎文件时(如 `npm install`或 `yarn install`)前,修改环境变量值,将默认的 `https://binaries.prisma.sh`替换为第2步搭建的服务器地址,即 `http://172.21.33.10:10000/prisma`.
