#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

compress_dir() {
  shopt -s nullglob
  local dir_name=$1
  pushd . > /dev/null
  cd ${dir_name}
  pwd

  for i in *.png; do
    local input=${i}
    local output=$(mktemp)
    local starts_with_dash=0
    local tmp_file_name=""

    # zopfli freaks out for things that start with a dash, so we need to
    # copy them first
    if [[ ${input} = -* ]]; then
      starts_with_dash=1
      tmp_file_name=$(mktemp)
      cp -- ${input} ${tmp_file_name}
      input=${tmp_file_name}
    fi

    zopflipng -m --iterations=15 --filters=0meb ${input} ${output}
    if [[ -f ${output} ]]; then
      mv -- "${output}" "${i}"
    fi

    if [[ -n ${tmp_file_name} ]]; then
      rm -f ${tmp_file_name};
    fi

    rm -f ${output}
  done

  popd
}


if [[ -n ${1} ]]; then
  compress_dir ${1}
  exit
fi

for i in $(find "${SCRIPT_DIR}/../public" -name '*.png' -exec dirname {} \;|sort -ur); do
  compress_dir ${i}
done
