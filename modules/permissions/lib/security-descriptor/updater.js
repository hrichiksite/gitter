'use strict';

var Troupe = require('gitter-web-persistence').Troupe;
var Group = require('gitter-web-persistence').Group;
var assert = require('assert');
var Promise = require('bluebird');

function updatePublicFlagForRepo(linkPath, isPublic) {
  assert(linkPath, 'linkPath expected');
  assert(isPublic === true || isPublic === false, 'isPublic must be a boolean');

  var query = {
    'sd.type': 'GH_REPO',
    'sd.linkPath': linkPath
  };

  var update = {
    $set: {
      'sd.public': isPublic
    }
  };

  return Promise.join(
    Troupe.update(query, update, { multi: true }).exec(),
    Group.update(query, update, { multi: true }).exec()
  );

  // TODO: consider sending live-collection updates
}

module.exports = {
  updatePublicFlagForRepo: updatePublicFlagForRepo
};
