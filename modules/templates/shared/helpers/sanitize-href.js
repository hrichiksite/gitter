'use strict';

function sanitizeHref(href = '') {
  const hrefLower = href.toLowerCase();
  const hasSafeSchema = hrefLower.indexOf('http:') === 0 || hrefLower.indexOf('https:') === 0;
  if (hasSafeSchema) {
    return href;
  }

  return '';
}

module.exports = sanitizeHref;
