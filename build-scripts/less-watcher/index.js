'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var stat = Promise.promisify(fs.stat);

var EventEmitter = require('events').EventEmitter;
var chokidar = require('chokidar');

var lessDependencyMapUtils = require('./lib/less-dependency-map-utils');

var transformPathsToAbsolute = function(paths, /*option*/ basePath) {
  paths = [].concat(paths);
  basePath = basePath || process.cwd();
  return paths.map(function(entryPoint) {
    return path.resolve(basePath, entryPoint);
  });
};

var transformEntryPointToDestFile = function(entryPoint, dest) {
  var fileName = path.basename(entryPoint, '.less') + '.css';
  return transformPathsToAbsolute(path.join(dest, fileName))[0];
};

var getLastModifiedTime = function(targetFile) {
  return stat(targetFile)
    .catch(function() {
      return {
        mtime: -1
      };
    })
    .then(function(targetStats) {
      return targetStats.mtime;
    });
};

var defaults = {
  lessOptions: {},
  watchGlob: undefined
};

var LessWatcher = function(entryPoints, options) {
  this.entryPoints = entryPoints;
  this.opts = _.extend({}, defaults, options);

  this.affectedEmitter = new EventEmitter();

  this.watchHandle = null;
};

LessWatcher.prototype.generateDepMap = function() {
  var depMap = {};
  var absoluteEntryPoints = transformPathsToAbsolute(this.entryPoints);
  var lessOptions = this.opts.lessOptions;

  var depMapGeneratedPromise = Promise.all(
    absoluteEntryPoints.map(function(entryPoint) {
      return lessDependencyMapUtils
        .generateLessDependencyMap(entryPoint, lessOptions)
        .then(function(partialDepMap) {
          depMap = lessDependencyMapUtils.extendDepMaps(depMap, partialDepMap);
        });
    })
  );

  return depMapGeneratedPromise.then(function() {
    return depMap;
  });
};

LessWatcher.prototype.getDepMap = function() {
  return this.depMap
    ? Promise.resolve(this.depMap)
    : this.generateDepMap().tap(
        function(depMap) {
          this.depMap = depMap;
        }.bind(this)
      );
};

LessWatcher.prototype.getDirtyEntryPoints = function() {
  var opts = this.opts;
  var entryPoints = this.entryPoints;
  var absoluteEntryPoints = transformPathsToAbsolute(entryPoints);

  var dirtyEntryMap = {};

  return this.getDepMap()
    .then(function(depMap) {
      var filesToCheck = Object.keys(depMap).concat(absoluteEntryPoints);

      return Promise.map(filesToCheck, function(needleFile) {
        return getLastModifiedTime(needleFile).then(function(needleMTime) {
          var affectedEntryPoints = lessDependencyMapUtils.getEntryPointsAffectedByFile(
            depMap,
            absoluteEntryPoints,
            needleFile
          );

          return Promise.each(affectedEntryPoints, function(entryPoint) {
            var destFile = transformEntryPointToDestFile(entryPoint, opts.dest);

            // Compare the entry(root) compiled file time to the needle(child) file time
            return getLastModifiedTime(destFile).then(function(destMTime) {
              var destTime = new Date(destMTime).getTime();
              var needleTime = new Date(needleMTime).getTime();

              if (destTime < needleTime) {
                dirtyEntryMap[entryPoint] = true;
              }
            });
          });
        });
      });
    })
    .then(function() {
      return Object.keys(dirtyEntryMap);
    });
};

LessWatcher.prototype.startWatching = function(/*optional*/ newWatchGlob) {
  console.log('Starting to watch Less');

  if (newWatchGlob) {
    this.opts.watchGlob = newWatchGlob;
  }

  var entryPoints = this.entryPoints;
  var opts = this.opts;
  var affectedEmitter = this.affectedEmitter;

  this.getDepMap()
    .bind(this)
    .then(function(depMap) {
      //console.log('depMap', depMap);
      console.log('depMap has ' + Object.keys(depMap).length + ' keys.');

      return depMap;
    })
    .then(function(depMap) {
      this.watchHandle = chokidar.watch(opts.watchGlob).on('all', function(e, needleFile) {
        if (e === 'change') {
          console.log(e, needleFile);
          var needlePath = path.resolve(process.cwd(), needleFile);
          var absoluteEntryPoints = transformPathsToAbsolute(entryPoints);

          // TODO: Update depMap with any `@import` changes in the `needleFile`

          var affectedEntryPoints = lessDependencyMapUtils.getEntryPointsAffectedByFile(
            depMap,
            absoluteEntryPoints,
            needlePath
          );

          affectedEmitter.emit('change', affectedEntryPoints);
        }
      });
    });
};

LessWatcher.prototype.stopWatching = function() {
  if (this.watchHandle) {
    this.watchHandle.close();
  }
};

// A nice wrapper so we don't have to use `new` in client code
module.exports = function() {
  var watcher = new (Function.prototype.bind.apply(
    LessWatcher,
    [null].concat(Array.prototype.slice.call(arguments))
  ))();

  return watcher;
};
