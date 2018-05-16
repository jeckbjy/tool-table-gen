#!/bin/sh
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

pushd $DIR/.. > /dev/null
if [ ! -d "node_modules" ]; then
  npm i
fi

popd > /dev/null

# 不修改工作目录
node ${DIR}/../src/zapp.js $*
