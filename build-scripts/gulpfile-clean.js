'use strict';

var gulp = require('gulp');
var del = require('del');

/**
 * Hook into the clean stage
 */
gulp.task('clean:clean', function(cb) {
  del(['output/'], cb);
});
