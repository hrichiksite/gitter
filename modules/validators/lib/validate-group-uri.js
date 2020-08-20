'use strict';

var reservedNamespaceHash = require('./reserved-namespaces').hash;

function validateGroupUri(uri) {
  if (typeof uri !== 'string') return false;

  // prevent groups called "login" and stuff like that
  if (reservedNamespaceHash[uri.toLowerCase()]) {
    return false;
  }

  // based on the room name regex
  return !!/^[\p{L}\d_][\p{L}\d_-]{1,80}$/u.test(uri);
}

module.exports = validateGroupUri;
