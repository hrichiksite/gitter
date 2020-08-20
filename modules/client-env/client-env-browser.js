/*eslint-env browser */

'use strict';
var parsedQuery = require('gitter-web-qs/parse');

var env = window.gitterClientEnv || {};
// Allow env through the querystring
if (parsedQuery.env) {
  var m;
  try {
    m = JSON.parse(parsedQuery.env);
  } catch (e) {
    // Ignore errors here
  }

  if (m) {
    Object.keys(m).forEach(function(k) {
      env[k] = m[k];
    });
  }
}

module.exports = env;
