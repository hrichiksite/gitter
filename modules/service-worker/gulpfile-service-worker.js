/* eslint-disable node/no-unpublished-require */
'use strict';

var gulp = require('gulp');
var del = require('del');
var path = require('path');
var webpackPipeline = require('./dev/gulp-tasks-webpack');

var ROOT = path.resolve(__dirname);
var OUTPUT_DIR = path.join(ROOT, 'output/');

function getOutputPath(relative) {
  if (relative) {
    return path.join(OUTPUT_DIR, relative);
  } else {
    return OUTPUT_DIR;
  }
}

gulp.task('service-worker:compile', ['service-worker:compile:webpack']);

gulp.task('service-worker:compile:webpack', function(cb) {
  return webpackPipeline(ROOT, cb).pipe(gulp.dest(getOutputPath('assets')));
});

gulp.task('service-worker:clean', function(cb) {
  del([getOutputPath()], cb);
});
