'use strict';

const reservedNamespaceHash = require('./reserved-namespaces').hash;

function validateUsername(username) {
  if (typeof username !== 'string') return false;

  // prevent groups called "login" and stuff like that
  if (reservedNamespaceHash[username.toLowerCase()]) {
    return false;
  }

  // based on the room name regex
  return !!/^[\p{L}\d_][\p{L}\d._-]{1,80}$/u.test(username);
}

module.exports = validateUsername;
