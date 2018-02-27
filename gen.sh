#!/bin/sh

mkdir -p ./build/output
rm -rf ./build/output/*

node ./src/zapp.js -c ./build/conf.js
