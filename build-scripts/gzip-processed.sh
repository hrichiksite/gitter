#!/bin/bash

while IFS= read -r -d $'\0' file; do
  cp -p "$file" "${file}.gztmp"
  gzip --best "$file"
  mv "${file}.gztmp" "$file"
done < <(find public-processed -type f ! -iname ".*" ! -iname "*.gz" ! -iname "*.png" ! -iname "*.jpg" ! -iname "*.gif"  -print0)