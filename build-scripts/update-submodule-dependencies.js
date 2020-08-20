#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

// Note, this script can't use any third-party dependencies
// as we don't know the status of the package when we
// run it

function die(err) {
  console.error(err.stack);
  process.exit(1);
}

var basePackage = require(path.join(__dirname, '..', 'package.json'));

function stat(baseDirectory, files, callback) {
  if (!files.length) return callback(null, {});
  var stats = {};
  var count = 0;

  files.forEach(function(file) {
    var fileName = path.join(baseDirectory, file);
    fs.stat(fileName, function(err, stat) {
      if (err) return callback(err);
      stats[file] = stat;
      count++;
      if (count === files.length) {
        callback(null, stats);
      }
    });
  });
}

function checkDirectory(baseDirectory, callback) {
  fs.readdir(baseDirectory, function(err, files) {
    if (err) return die(err);

    stat(baseDirectory, files, function(err, filesStat) {
      if (filesStat['package.json']) {
        return callback(null, path.join(baseDirectory, 'package.json'));
      } else {
        var directories = files
          .filter(function(f) {
            if (f === 'node_modules') return false;
            return filesStat[f].isDirectory();
          })
          .map(function(f) {
            return path.join(baseDirectory, f);
          });

        return callback(null, null, directories);
      }
    });
  });
}

function searchNext(queue, results, callback) {
  var next = queue.pop();
  checkDirectory(next, function(err, packageJson, subDirectories) {
    if (err) return callback(err);
    if (packageJson) {
      results.push(packageJson);
    } else {
      queue = queue.concat(subDirectories);
    }

    if (queue.length) {
      searchNext(queue, results, callback);
    } else {
      callback(null, results);
    }
  });
}

function findChildModulePackages(queue, callback) {
  if (queue.length === 0) return callback(null, []);
  searchNext(queue, [], callback);
}

function findBaseDependency(name) {
  if (basePackage.dependencies[name]) {
    return basePackage.dependencies[name];
  }

  if (basePackage.devDependencies[name]) {
    return basePackage.devDependencies[name];
  }
}

function normalise(version, relativeTo) {
  if (version.indexOf('file:') !== 0) return version;
  var location = version.substring(5);
  var j = path.normalize(path.join(__dirname, '../', location));
  var relLocation = path.relative(path.dirname(relativeTo), j);
  return 'file:' + relLocation;
}

function processDepsHash(hash, packageFile) {
  var results = [];
  if (!hash) return results;
  Object.keys(hash).forEach(function(dependency) {
    var baseVersion = findBaseDependency(dependency);

    var baseVersionNormalised = normalise(baseVersion, packageFile);
    if (baseVersionNormalised !== hash[dependency]) {
      results.push({
        name: dependency,
        correctVersion: baseVersionNormalised,
        currentVersion: hash[dependency]
      });
    }
  });

  return results;
}

function installUpdates(packageFile, isDev, changes) {
  var wd = path.dirname(packageFile);

  if (!changes || !changes.length) return;

  var versions = changes
    .map(function(c) {
      var correctVersion = c.correctVersion;
      if (correctVersion.charAt(0) === '^') {
        correctVersion = correctVersion.substring(1);
      }
      return c.name + '@' + correctVersion;
    })
    .join(' ');

  console.log(
    '(cd ' +
      wd +
      '; npm i ' +
      versions +
      (isDev ? ' --save-dev' : ' --save') +
      '; rm -rf node_modules)'
  );
}

function updateDependenciesForPackage(packageFile) {
  var packageJson = require(packageFile);
  var prodChanges = processDepsHash(packageJson.dependencies, packageFile);
  var devChanges = processDepsHash(packageJson.devDependencies, packageFile);

  installUpdates(packageFile, false, prodChanges);
  installUpdates(packageFile, true, devChanges);
}

findChildModulePackages(
  [path.join(__dirname, '..', 'shared'), path.join(__dirname, '..', 'modules')],
  function(err, results) {
    if (err) return die(err);

    results.forEach(function(packageFile) {
      updateDependenciesForPackage(packageFile);
    });
  }
);
