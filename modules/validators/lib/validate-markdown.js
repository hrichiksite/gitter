'use strict';

function validateMarkdown(text) {
  // for now just make sure it is a string
  if (String(text) !== text) {
    return false;
  }

  return true;
}

module.exports = validateMarkdown;
