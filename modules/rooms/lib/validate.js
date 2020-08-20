'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var StatusError = require('statuserror');

var m = {
  expect: function(value, message) {
    if (!value) {
      winston.warn('failed-validation:' + message);
      throw new StatusError(400, message);
    }
  },

  fail: function(message) {
    winston.warn('failed-validation:' + message);
    throw new StatusError(400, message);
  }
};

module.exports = m;
