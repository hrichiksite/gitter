'use strict';

var path = require('path');
var fs = require('fs');
var handlebars = require('handlebars');
var hbsInstance = handlebars.create();
var resolveStatic = require('./resolve-static');

/* Horrible circular-dep hack */
setImmediate(function() {
  var registerHelpers = require('./register-helpers');
  registerHelpers(hbsInstance);
});

var registerPartials = require('./register-partials');
registerPartials(hbsInstance);

/**
 * compiles templates for other modules given a path
 */
module.exports = function(templatePath) {
  if (!templatePath) throw new Error('You must provide a path to the template.');

  if (path.extname(templatePath) === '') {
    templatePath += '.hbs';
  }

  var buffer = fs.readFileSync(resolveStatic(templatePath));
  return hbsInstance.compile(buffer.toString());
};

module.exports.compileString = function(string) {
  return hbsInstance.compile(string);
};
