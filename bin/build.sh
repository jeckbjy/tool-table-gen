#!/bin/sh
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

pushd $DIR/.. > /dev/null
if [ ! -d "node_modules" ]; then
  npm i
fi

node src/zapp.js $*

popd > /dev/null

