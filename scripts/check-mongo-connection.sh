#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

NODE_ENV=$1 node $SCRIPT_DIR/check-mongo-connection.js