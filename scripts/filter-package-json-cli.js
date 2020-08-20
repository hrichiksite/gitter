#!/usr/bin/env node
// Usage: cat package.json | node filter-package-json-cli.js
'use strict';

function filterLocalDeps(depMap) {
  return Object.keys(depMap).reduce((result, dependency) => {
    const semver = depMap[dependency];
    if (!semver.match(/^file:/i)) {
      result[dependency] = semver;
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
  const packageData = JSON.parse(cliInput);

  const packageResultant = Object.assign({}, packageData, {
    dependencies: filterLocalDeps(packageData.dependencies || {}),
    devDependencies: filterLocalDeps(packageData.devDependencies || {})
  });

  console.log(JSON.stringify(packageResultant, null, '  '));
});

process.stdin.resume();
