'use strict';

var gulp = require('gulp');
var webpack = require('webpack-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var filter = require('gulp-filter');
var pump = require('pump');
var gutil = require('gulp-util');

function webpackPipeline(rootDir) {
  var javascriptFileFilter = filter(['**/*.js'], { restore: true, passthrough: false });
  return pump(
    [
      gulp.src(rootDir + '/webpack.config.js'),
      webpack(require('../webpack.config')),
      sourcemaps.init({ /* loadMaps: true */ debug: true }),
      javascriptFileFilter,
      uglify(),
      javascriptFileFilter.restore,
      sourcemaps.write('../maps')
    ],
    function(err) {
      if (err) {
        gutil.log(err);
        process.exit(1);
      }
    }
  );
}

module.exports = webpackPipeline;
