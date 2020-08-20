'use strict';

var packageJson = require('../package.json');
var eslintFiles = Object.keys(packageJson.devDependencies)
  .filter(function(dependency) {
    return dependency.indexOf('eslint') === 0;
  })
  .map(function(dependency) {
    if (process.argv[1] === '--semver') {
      return dependency + '@' + packageJson.devDependencies[dependency];
    } else {
      return dependency;
    }
  });

console.log(eslintFiles.join('\n'));
