'use strict';

var gulpStaged = require('./build-scripts/gulp-staged');

gulpStaged({
  clean: require('./build-scripts/gulpfile-clean'),

  linter: require('./build-scripts/gulpfile-linter'),
  test: require('./build-scripts/gulpfile-test'),
  clientapp: require('./build-scripts/gulpfile-clientapp'),
  css: require('./build-scripts/gulpfile-css'),
  process: require('./build-scripts/gulpfile-process'),
  compress: require('./build-scripts/gulpfile-compress'),

  'service-worker': require('./modules/service-worker/gulpfile-service-worker')
});
