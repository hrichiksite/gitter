'use strict';

var clientEnv = require('gitter-client-env');
var cdns = clientEnv.avatarCdns;

function hash(string) {
  var hash = 0;
  if (!string.length) return hash;
  var start = string.length - 10;
  if (start < 0) start = 0;

  for (var i = start; i < string.length; i++) {
    var char = string.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  if (hash < 0) return -hash;
  return hash;
}

function resolve(relativePath) {
  if (cdns.length < 2) {
    return cdns[0] + relativePath;
  }

  var h = hash(relativePath);
  return cdns[h % cdns.length] + relativePath;
}

module.exports = resolve;
