'use strict';

var Promise = require('bluebird');
var assert = require('assert');
var _ = require('lodash');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');

/**
 * Return a value or a promise of the team members
 */
function resolveTeam(room, user, groupName) {
  if (!groupName) return;
  groupName = String(groupName);

  if (groupName.toLowerCase() === 'all') {
    return policyFactory
      .createPolicyForRoom(user, room)
      .then(function(policy) {
        return policy.canAdmin();
      })
      .then(function(access) {
        // Only admins are allowed to use 'all' for now
        if (!access) return;

        return { announcement: true };
      });
  }
}

/**
 * Given a room, a user and a list of group names,
 * returns a hash of the groupName and the users in that group
 */
module.exports = Promise.method(function resolve(room, user, groupNames) {
  assert(room && room.id);
  assert(user && user.id);

  if (!groupNames.length) return {}; // No point in continuing

  return Promise.map(groupNames, function(groupName) {
    return resolveTeam(room, user, groupName);
  }).then(function(groupDetails) {
    // Turn the array of arrays into a hash
    return _.reduce(
      groupDetails,
      function(memo, groupDetail, i) {
        if (!groupDetail) return memo;

        var groupName = groupNames[i];
        memo[groupName] = groupDetail;
        return memo;
      },
      {}
    );
  });
});
