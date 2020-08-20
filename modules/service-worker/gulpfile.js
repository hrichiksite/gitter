/* eslint-disable node/no-unpublished-require */
'use strict';

var gulpStaged = require('../../build-scripts/gulp-staged');

gulpStaged({
  'service-worker': require('./gulpfile-service-worker')
});
