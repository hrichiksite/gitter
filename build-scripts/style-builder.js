'use strict';

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var Promise = require('bluebird');
var _ = require('lodash');

var lessWatcher = require('./less-watcher');

var defaults = {
  dest: './',
  sourceMapOptions: {},
  // ... postcss
  streamTransform: function(stream) {
    return stream;
  }
  // Also see `LessWatcher` opts, `watchGlob`, `lessOptions`
};

module.exports = function(entryPoints, options) {
  var opts = _.extend({}, defaults, options);

  var myLessWatcher = lessWatcher(entryPoints, opts);

  var buildStyles = function(entryPoints) {
    return new Promise(function(resolve, reject) {
      // We use gulp here for easy building
      var stream = gulp
        .src(entryPoints)
        .pipe(sourcemaps.init())
        .pipe(less(opts.lessOptions));

      opts
        .streamTransform(stream)
        .pipe(sourcemaps.write(opts.sourceMapOptions.dest, opts.sourceMapOptions.options))
        .pipe(gulp.dest(opts.dest))
        .on('end', function() {
          resolve();
        })
        .on('error', function(err) {
          reject(err);
        });
    });
  };

  myLessWatcher.affectedEmitter.on('change', function(result) {
    console.log('affected', result);
    buildStyles(result).then(function() {
      console.log('building done');
    });
  });

  return {
    build: function(force) {
      var getTargetEntryPointsPromise = Promise.resolve(entryPoints);
      if (!force) {
        getTargetEntryPointsPromise = myLessWatcher.getDirtyEntryPoints();
      }

      return getTargetEntryPointsPromise
        .then(function(targetEntryPoints) {
          return buildStyles(targetEntryPoints);
        })
        .then(function() {
          console.log('building done');
        });
    },
    startWatching: myLessWatcher.startWatching.bind(myLessWatcher),
    stopWatching: myLessWatcher.stopWatching.bind(myLessWatcher)
  };
};
