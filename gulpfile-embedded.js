'use strict';

var gulpStaged = require('./build-scripts/gulp-staged');

gulpStaged({
  clean: require('./build-scripts/gulpfile-clean'),
  embedded: require('./build-scripts/gulpfile-embedded')
});
