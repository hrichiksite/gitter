#!/bin/bash

set -e

url="$2"

if [[ "$url" != *"dev.gitlab.org"* ]]
then
  echo "Pushing to remotes other than dev.gitlab.org has been disabled!"
  echo "Run scripts/security-harness to disable this check."
  echo

  exit 1
fi
