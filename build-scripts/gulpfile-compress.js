'use strict';

var gulp = require('gulp');
var gzip = require('gulp-gzip');
var tar = require('gulp-tar');
var restoreTimestamps = require('./gulp-restore-timestamps');

gulp.task('compress:assets:files:gzip', function() {
  return gulp
    .src(['output/assets/**/*.{css,js,ttf,svg,eot}', '!**/*.map'], {
      stat: true,
      base: 'output/assets/'
    })
    .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
    .pipe(gulp.dest('output/assets/'))
    .pipe(restoreTimestamps());
});

// Brotli compression for text files
gulp.task('compress:assets:files:brotli:text', function() {
  if (!process.env.ENABLE_BROTLI_COMPRESSION) return;

  var brotli = require('gulp-brotli');
  return gulp
    .src(['output/assets/**/*.{css,svg,js}', '!**/*.map'], { stat: true, base: 'output/assets/' })
    .pipe(
      brotli.compress({
        mode: 1, // 1 = TEXT
        extension: 'br',
        quality: 11
      })
    )
    .pipe(gulp.dest('output/assets/'))
    .pipe(restoreTimestamps());
});

// Brotli compression for non-text files
gulp.task('compress:assets:files:brotli:generic', function() {
  if (!process.env.ENABLE_BROTLI_COMPRESSION) return;

  var brotli = require('gulp-brotli');
  return gulp
    .src(['output/assets/**/*.{ttf,eot}', '!**/*.map'], { stat: true, base: 'output/assets/' })
    .pipe(
      brotli.compress({
        mode: 0, // 0 = GENERIC
        extension: 'br',
        quality: 11
      })
    )
    .pipe(gulp.dest('output/assets/'))
    .pipe(restoreTimestamps());
});

gulp.task('compress:assets:files:brotli', [
  'compress:assets:files:brotli:generic',
  'compress:assets:files:brotli:text'
]);

gulp.task('compress:assets:files', ['compress:assets:files:brotli', 'compress:assets:files:gzip']);

gulp.task('compress:assets:tarball', ['compress:assets:files'], function() {
  return gulp
    .src(['output/assets/**', '!**/*.map'], { stat: true })
    .pipe(tar('assets.tar'))
    .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
    .pipe(gulp.dest('output'));
});

gulp.task('compress:post-package', ['compress:assets:tarball']);
