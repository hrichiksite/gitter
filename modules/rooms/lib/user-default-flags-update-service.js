'use strict';

var Promise = require('bluebird');
var assert = require('assert');
var roomMembershipFlags = require('./room-membership-flags');
var userDefaultFlagsService = require('./user-default-flags-service');
var roomMembershipService = require('./room-membership-service');

function updateDefaultModeForUser(user, mode, overrideExistingValues) {
  assert(user, 'Expected user');
  assert(mode, 'Expected mode');

  var newDefaultFlags = roomMembershipFlags.getFlagsForMode(mode, true);
  var userId = user._id;

  // First, update the user...
  return userDefaultFlagsService.setDefaultFlagsForUserId(userId, newDefaultFlags).then(function() {
    user.defaultFlags = newDefaultFlags;
    // Now, update the rooms
    return roomMembershipService.updateRoomMembershipFlagsForUser(
      userId,
      newDefaultFlags,
      overrideExistingValues
    );
  });
}

exports.updateDefaultModeForUser = Promise.method(updateDefaultModeForUser);
