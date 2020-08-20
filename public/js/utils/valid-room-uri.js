'use strict';

var reservedNamespaceHash = require('gitter-web-validators/lib/reserved-namespaces').hash;
var reservedSubNamespaceHash = require('gitter-web-validators/lib/reserved-sub-namespaces').hash;

module.exports = function(uri) {
  if (!uri) return false;

  var parts = uri.slice(1).split('/');
  if (reservedNamespaceHash[parts[0]]) {
    return false;
  }
  if (parts.length > 1 && reservedSubNamespaceHash[parts[1]]) {
    return false;
  }

  if (/\/archives\/(all|\d{4}\/\d{2}\/\d{2})/.test(uri)) {
    return false;
  }
  if (/^\/orgs\//.test(uri)) {
    return false;
  }

  // TODO: this should be
  // /[A-Za-z0-9-]/
  return /\/[^]+/.test(uri);
};
