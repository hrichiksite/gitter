'use strict';

var fs = require('fs');
var path = require('path');

module.exports = function(serializerDirectory) {
  var e = {
    serialize: require('gitter-web-serialization/lib/serialize'),
    serializeObject: require('gitter-web-serialization/lib/serialize-object')
  };

  fs.readdirSync(__dirname + '/' + serializerDirectory).forEach(function(fileName) {
    if (!/\.js$/.test(fileName)) return;

    var baseName = path.basename(fileName, '.js');

    var strategyName = baseName
      .replace(/\-./g, function(match) {
        return match[1].toUpperCase();
      })
      .replace(/^./, function(match) {
        return match.toUpperCase();
      });

    var Strategy = require('./' + serializerDirectory + '/' + baseName);
    if (Strategy.prototype) {
      Strategy.prototype.strategyType = serializerDirectory; // Not ideal
    }

    e[strategyName] = Strategy;
  });

  return e;
};
