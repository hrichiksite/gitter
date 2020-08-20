'use strict';

var slugify = require('gitter-web-slugify');

function validateSlug(slug) {
  // it is always required
  if (!slug) return false;

  // We could use a regex here, but I find this is the most safe, reliable and
  // also often quickest way.
  return slugify(slug) === slug;
}

module.exports = validateSlug;
