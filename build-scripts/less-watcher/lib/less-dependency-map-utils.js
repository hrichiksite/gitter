'use strict';

var Promise = require('bluebird');
var fs = require('fs');
var readFile = Promise.promisify(fs.readFile);
var stat = Promise.promisify(fs.stat);
var path = require('path');
var pathUtils = require('./path-parse-format-utils');
var _ = require('lodash');
var memoize = require('memoize-promise');

var extendDepMaps = function(/*n-number of depMaps*/) {
  var resultantDepMap = {};
  Array.prototype.forEach.call(arguments, function(pDepMap) {
    pDepMap = pDepMap || {};
    Object.keys(pDepMap).forEach(function(pMapKey) {
      var pMapValue = pDepMap[pMapKey];

      resultantDepMap[pMapKey] = resultantDepMap[pMapKey] || {};

      Object.keys(pMapValue).forEach(function(rKey) {
        resultantDepMap[pMapKey][rKey] = true;
      });
    });
  });

  return resultantDepMap;
};

var defaults = {
  // This is an option of less.js so we need to support it
  // It allows you to relatively resolve modules from paths defined here
  paths: [],
  debug: false
};

// FIXME: It looks like the result of rendering with the less library has
// an `imports` array already on it so we don't need to tackle it ourselves.
// `require('less').render(data, opts).then(function(output) { output.imports; })`
//
// We memoize to cache any calls for the same file (ex. many files will want to check `colors.less`)
var generateLessDependencyMap = memoize(function(rootFilePath, options, /*internal*/ depMap) {
  var opts = _.extend({}, defaults, options);
  depMap = depMap || {};
  //console.log('c', rootFilePath);

  var absolutePathsOptionHash = (function() {
    var hash = {};
    opts.paths.map(function(dir) {
      hash[path.resolve(process.cwd(), dir)] = true;
    });

    return hash;
  })();

  return (
    readFile(rootFilePath, 'utf8')
      // Find `@import`'s' in the file
      .then(function(data) {
        var importRe = /@import (?:\([^)]+\) )?["|'](.+?)["|']/g;

        var matchedFilePaths = [];
        data.replace(importRe, function(match, matchedFilePath) {
          var parsedPath = pathUtils.parsePath(matchedFilePath);
          if (!parsedPath.ext || parsedPath.ext.length === 0) {
            parsedPath.ext = '.less';
          }
          matchedFilePaths.push(pathUtils.formatPath(parsedPath));
        });

        return matchedFilePaths;
      })
      .then(function(matchedFilePaths) {
        //console.log('m', rootFilePath, matchedFilePaths);
        var checkAllMatchedFilesModifiedPromises = matchedFilePaths.map(function(matchedFilePath) {
          // Assemble a list of directories the `@import` can resolve from
          var parentDirectoryPath = path.resolve(process.cwd(), path.dirname(rootFilePath));
          var possibleDirs = Object.keys(
            _.extend(
              {},
              absolutePathsOptionHash,
              (function() {
                var tempHash = {};
                tempHash[parentDirectoryPath] = true;
                return tempHash;
              })()
            )
          );

          // `true` means we found a modification
          // `false` means we didn't find a modification
          // `undefined` means we couldn't find the file
          var checkAllDirsFileModifiedPromises = possibleDirs.map(function(dir) {
            var importFilePath = path.join(dir, matchedFilePath);

            return stat(importFilePath)
              .then(function(/*stats*/) {
                //console.log('\ti', rootFilePath, importFilePath);

                // Found a new dep
                depMap[importFilePath] = depMap[importFilePath] || {};
                depMap[importFilePath][rootFilePath] = true;

                // Recursion: @import file has not been modified but, lets check the @import's of this file.
                var recursiveResult = generateLessDependencyMap(importFilePath, options, depMap);
                // Merge the recursive depMap result into our state
                return recursiveResult.then(function(pDepMap) {
                  depMap = extendDepMaps(depMap, pDepMap);
                });
              })
              .catch(function(/*err*/) {
                // Swallow any errors
                // We don't care about not finding it because
                // there are multiple directories(`opts.paths`) to check
              });
          });

          return Promise.all(checkAllDirsFileModifiedPromises).then(function(checkFileResults) {
            if (opts.debug) {
              // `undefined` filled results means we weren't able to find the `@import` at all
              var fileNotFound = checkFileResults.reduce(function(prev, result) {
                return prev && result === undefined;
              }, true);

              if (fileNotFound) {
                console.log('`@import` was not found:', matchedFilePath);
              }
            }
          });
        });

        return Promise.all(checkAllMatchedFilesModifiedPromises);
      })
      .then(function() {
        //console.log('dd', depMap);
        return depMap;
      })
  );
});

var getEntryPointsAffectedByFile = function(
  depMap,
  entryPoints,
  needleFile,
  /*internal*/ touchedEntryPoints,
  /*internal*/ isRecursiveRun
) {
  touchedEntryPoints = touchedEntryPoints || {};

  var checkIfFileIsEntry = function(file) {
    entryPoints.some(function(entryPoint) {
      if (file === entryPoint) {
        touchedEntryPoints[entryPoint] = true;
        // break
        return true;
      }
    });
  };

  // Initially check the file itself they passed in
  checkIfFileIsEntry(needleFile);

  Object.keys(depMap[needleFile] || {}).forEach(function(fileDep) {
    // Check to see if the current dep is the entry we are looking for
    checkIfFileIsEntry(fileDep);

    // Recursion:
    var nextDeps = depMap[fileDep];
    if (nextDeps) {
      var recursiveResult = getEntryPointsAffectedByFile(
        depMap,
        entryPoints,
        fileDep,
        touchedEntryPoints,
        true
      );
      _.extend(touchedEntryPoints, recursiveResult);
    }
  });

  if (isRecursiveRun) {
    return touchedEntryPoints;
  }

  return Object.keys(touchedEntryPoints);
};

module.exports = {
  generateLessDependencyMap: generateLessDependencyMap,
  extendDepMaps: extendDepMaps,
  getEntryPointsAffectedByFile: getEntryPointsAffectedByFile
};
