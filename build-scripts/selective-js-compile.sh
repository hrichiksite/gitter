#!/bin/bash

set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"

generate_md5() {
  if [[ -x $(which md5) ]]; then
    md5 -q $1
  else
    md5sum $1 |cut -d\  -f1
  fi
}

for i in $(find $ROOT_DIR/public-processed/js -maxdepth 1 -name '*.js' ! -name '*.min.js'); do
  min_file=${i%.js}.min.js
  md5_file=$i.md5
  md5_checksum=$(generate_md5 $i)

  #
  # A little bit of debugging
  #
  if [[ ! -f $md5_file ]]; then
    echo "$i: $md5_file does not exist" >&2
  else
    if [[ ! -f $min_file ]]; then
        echo "$i: $min_file does not exist" >&2
    else
      if [[ $md5_checksum != $(cat $md5_file) ]]; then
        echo "$i Checksum mismatch $md5_checksum != $(cat $md5_file)" >&2
      fi
    fi
  fi

  if [[ ! -f $md5_file ]] || [[ ! -f $min_file ]] || [[ $md5_checksum != $(cat $md5_file) ]]; then
    echo $i needs updating >&2

    rm -f $min_file ${min_file}.gz ${min_file}.map ${min_file}.map.gz
    nice grunt manglejs --module $(basename $i) # & disabling async
    echo $md5_checksum > $md5_file
  else
    echo "$i is compiled" >&2
  fi
done

# wait

for i in $(find $ROOT_DIR/public-processed/js -name '*.js' ! -name '*.min.js'); do
  min_file=${i%.js}.min.js
  if [[ ! -f $min_file ]]; then
    echo Missing $min_file >&2
    exit 1
  fi
done
