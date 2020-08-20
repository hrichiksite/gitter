'use strict';

function validateDisplayName(name) {
  // check that it is a string
  if (String(name) !== name) {
    return false;
  }

  // make sure it doesn't have spaces before/after it
  if (name.trim() !== name) {
    return false;
  }

  // oh and it is required
  if (!name) {
    return false;
  }

  return true;
}

module.exports = validateDisplayName;
