'use strict';

function validateAdminOnly(adminOnly) {
  if (adminOnly === undefined) {
    // empty is allowed as the db will just use/fill in the default
    return true;
  }

  // empty, true or false and nothing else
  return adminOnly === true || adminOnly === false;
}

module.exports = validateAdminOnly;
