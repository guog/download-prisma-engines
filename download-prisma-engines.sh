#!/bin/bash

# This script downloads the Prisma Engines for the specified version and platform

set -eux

# 官方镜像源
# mirror="https://binaries.prisma.sh"
# 国内镜像源
mirror="https://registry.npmmirror.com/-/binary/prisma/all_commits"

# 修改这里即可
commit="06fc58a368dc7be9fbbbe894adf8d445d208c284"

filename="urls.txt"

while read line
do
    url="${mirror}/${commit}/${line}"
    wget -p -r -l4 -E -nH $url
done < $filename
