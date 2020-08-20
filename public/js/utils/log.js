'use strict';

var log = require('loglevel');

try {
  window.gitterSetLogLevel = function(level) {
    log.setLevel(level);
  };
} catch (err) {
  // noop, ignore `ReferenceError: window is not defined` when running in tests
}

module.exports = log;
