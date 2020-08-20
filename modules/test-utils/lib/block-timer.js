'use strict';

var env = require('gitter-web-env');
var winston = env.logger;

var timer;
var t;
var last;

module.exports = {
  on: function() {
    if (timer) return;

    timer = true;
    last = Date.now();

    t = setInterval(function checkLoop() {
      var n = Date.now();
      if (n - last > 50) winston.warn('Block ' + (n - last) + 'ms');
      last = n;
    }, 10);
  },
  off: function() {
    timer = false;
    clearTimeout(t);
  },
  reset: function() {
    last = Date.now();
  }
};
