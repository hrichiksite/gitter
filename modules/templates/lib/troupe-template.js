'use strict';

var HandlebarsWrapper = require('./handlebars-wrapper');
var wrapper = new HandlebarsWrapper();

/**
 * @deprecated
 */
function compile(sourceFileName, callback) {
  return wrapper.compile(sourceFileName).nodeify(callback);
}

module.exports = {
  compile: compile
};
