'use strict';

var slug = require('slug');

function slugify(text) {
  if (String(text) !== text) return '';
  return slug(text).toLowerCase();
}

module.exports = slugify;
