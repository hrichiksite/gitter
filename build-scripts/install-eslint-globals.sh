#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

for i in $(node ${SCRIPT_DIR}/find-eslint-dependencies.js); do
  npm rm -g ${i}
done

for i in $(node ${SCRIPT_DIR}/find-eslint-dependencies.js --semver); do
  npm i -g ${i}
done
