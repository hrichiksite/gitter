'use strict';

var getOrgNameFromTroupeName = require('./get-org-name-from-troupe-name');

/**
 * @deprecated
 */
module.exports = function getOrgNameFromUri(uri) {
  //We do have the url /orgs/:orgName/rooms which we have to account for
  if (/^orgs/.test(uri)) {
    return uri.split('/')[1];
  }
  return getOrgNameFromTroupeName(uri);
};
