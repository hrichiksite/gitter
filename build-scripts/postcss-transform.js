'use strict';

var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var mqpacker = require('css-mqpacker');
var csswring = require('csswring');

function postCssTransform(options) {
  return postcss([
    autoprefixer({
      browsers: options.browsers,
      cascade: false
    }),
    mqpacker,
    csswring
  ]);
}

module.exports = postCssTransform;
