'use strict';

function slugger(text) {
  const trimmedText = text.trim();
  const parts = trimmedText.split(/[^\p{L}\d_]+/u);

  return parts
    .filter(function(part) {
      return part.length > 0;
    })
    .join('-');
}

function isValid(text) {
  return /^[\p{L}\d_-]+$/u.test(text);
}

module.exports = slugger;
module.exports.isValid = isValid;
