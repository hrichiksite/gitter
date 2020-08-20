#!/usr/bin/env node
// Usage: cat package-lock.json | node filter-package-lock-json-cli.js
'use strict';

function filterLocalDeps(depMap) {
  return Object.keys(depMap).reduce((result, dependency) => {
    const depInfo = depMap[dependency];
    if (!depInfo.version.match(/^file:/i)) {
      result[dependency] = depInfo;
    }

    return result;
  }, {});
}

let cliInput = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(d) {
  cliInput = cliInput + d;
});

process.stdin.on('end', function() {
  const packageLockData = JSON.parse(cliInput);

  const packageLockResultant = Object.assign({}, packageLockData, {
    dependencies: filterLocalDeps(packageLockData.dependencies || {}),
    devDependencies: filterLocalDeps(packageLockData.devDependencies || {})
  });

  console.log(JSON.stringify(packageLockResultant, null, '  '));
});

process.stdin.resume();
