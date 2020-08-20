#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

find_file_deps() {
  node -e '''
  var pkg = require("./package.json");
  var path = require("path");
  function dep(d) {
    return Object.keys(d).filter(function(key) {
      var spec = d[key];
      return spec.indexOf("file:") === 0
    });
  }
  var fileDeps = dep(pkg.dependencies).concat(dep(pkg.devDependencies));
  fileDeps.forEach(function(f) {
    console.log(path.resolve(path.join("node_modules", f)));
  })
'''
}

find_deps() {
  linklocal list --format '%S' --no-summary || find_file_deps;
}

find_deps|while read line; do
  if [[ -d "${line}" ]] && [[ ! -h "${line}" ]]; then
    rm -r "${line}";
  fi;
done
