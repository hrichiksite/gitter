'use strict';
var handlebars = require('handlebars');
var SafeString = handlebars.SafeString;

module.exports = function wrapper(fn) {
  return function() {
    var result = fn.apply(this, arguments);
    return new SafeString(result);
  };
};
