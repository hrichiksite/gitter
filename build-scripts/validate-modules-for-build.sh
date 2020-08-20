#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

## For some reason, the node_modules in jenkins sometimes appears to be missing
## some of these files. If any of them are missing, we need to do a full
## npm install from the makefile

if ! [[ -x ${SCRIPT_DIR}/../node_modules/.bin/gulp ]]; then echo "Missing gulp"; exit 1; fi
if ! [[ -x ${SCRIPT_DIR}/../node_modules/.bin/nyc ]]; then echo "Missing nyc"; exit 1; fi
if ! [[ -x ${SCRIPT_DIR}/../node_modules/.bin/mocha ]]; then echo "Missing mocha"; exit 1; fi
