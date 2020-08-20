'use strict';

function toParts(uri) {
  if (!uri) return [];

  var parts = uri.split('/');

  var i;
  for (i = parts.length; i >= 1 && !parts[i - 1]; i--);
  parts.length = i;

  return parts;
}

function toPath(uri) {
  return toParts(uri).join('/');
}

module.exports = {
  toParts: toParts,
  toPath: toPath
};
