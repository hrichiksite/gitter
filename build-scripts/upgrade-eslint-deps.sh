#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

set -x

MODULES=$(jq  -r '.devDependencies|keys|.[]' package.json |grep eslint)
for i in $MODULES; do
  npm rm $i;
done

for i in $MODULES; do
  npm i $i@latest --save-dev
done
