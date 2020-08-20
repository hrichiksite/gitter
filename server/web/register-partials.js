'use strict';

var path = require('path');
var fs = require('fs-extra');
var glob = require('glob');

module.exports = function(hbs) {
  var baseDir = path.resolve(__dirname, '../../');
  var partialsDir = path.resolve(baseDir, './public/templates/partials/');
  var partialsGlob = path.join(partialsDir, '**/*.hbs');

  var files = glob.sync(partialsGlob);
  return files.map(function(file) {
    var partialName = path.relative(partialsDir, file).replace(/\.hbs$/, '');
    var partialTemplate = fs.readFileSync(file, 'utf8');
    hbs.registerPartial(partialName, partialTemplate);

    return partialName;
  });
};
