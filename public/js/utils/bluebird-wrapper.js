'use strict';

/* This require looks HORRIBLE, but it's a way to use the non-aliased moment */
/* Webpack config will alias all usages of moment to this module */
var Promise = require('../../../node_modules/bluebird');

function getBluebirdConfig() {
  try {
    return {
      warnings: window.localStorage.BLUEBIRD_LONG_STACK_TRACES === '1',
      longStackTraces: window.localStorage.BLUEBIRD_WARNINGS === '1'
    };
  } catch (e) {
    return {
      warnings: false,
      longStackTraces: false
    };
  }
}

var config = getBluebirdConfig();

Promise.config({
  warnings: config.warnings,
  longStackTraces: config.longStackTraces,
  cancellation: true
});

module.exports = Promise;
