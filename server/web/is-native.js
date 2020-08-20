'use strict';

function isNative(req) {
  var userAgentString = req.headers['user-agent'];
  if (!userAgentString) return;

  return userAgentString.toLowerCase().indexOf('gitter') >= 0;
}

module.exports = isNative;
