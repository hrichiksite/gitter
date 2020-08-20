#!/bin/bash

set -e
set -x

function join { local IFS="$1"; shift; echo "$*"; }

cmd=$(join " " "$@")

if [[ -n "$SU_TO_USER" ]]; then
  adduser --no-create-home --gecos "" --disabled-password $SU_TO_USER --uid $SU_TO_UID
  chown $SU_TO_USER output/

  PATH="$(pwd)/node_modules/.bin/:${PATH}"
  export PATH

  echo Path: $PATH
  echo Jenkins URL: $JENKINS_URL
  su $SU_TO_USER --preserve-environment -s '/bin/bash' -c "PATH=${PATH} DEBUG=${DEBUG} $cmd"
else
  PATH="$(pwd)/node_modules/.bin:${PATH}"
  export PATH

  /bin/bash -c "PATH=${PATH} DEBUG=${DEBUG} $cmd"
fi
