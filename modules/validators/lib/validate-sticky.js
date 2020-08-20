'use strict';

function validateSticky(sticky) {
  if (sticky === null || sticky === undefined) {
    // the database will fill in the default of 0
    return true;
  }

  if (parseInt(sticky, 10) !== sticky) {
    return false;
  }

  if (sticky < 0) {
    return false;
  }

  return true;
}

module.exports = validateSticky;
