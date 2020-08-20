'use strict';

var reservedSubNamespaceHash = require('./reserved-sub-namespaces').hash;

function validateRoomName(name) {
  // must be defined and empty string not allowed
  if (!name) return false;

  // prevent rooms called "archives"/"home" and stuff like that.
  if (reservedSubNamespaceHash[name.toLowerCase()]) {
    return false;
  }

  return !!/^[\p{L}\d_.][\p{L}\d._-]{1,80}$/u.test(name);
}

module.exports = validateRoomName;
