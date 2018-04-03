#!/bin/sh

mkdir -p ./build/output
rm -rf ./build/output/*

./bin/build.sh -c ./build/conf.js
# node ./src/zapp.js -c ./build/conf.js
