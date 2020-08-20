'use strict';

var Promise = require('bluebird');
var assert = require('assert');
var roomMembershipFlags = require('./room-membership-flags');
var userDefaultFlagsService = require('./user-default-flags-service');
var roomMembershipService = require('./room-membership-service');

function setModeForUserInRoom(user, roomId, mode) {
  assert(user, 'Expected user');
  assert(roomId, 'Expected roomId');
  assert(mode, 'Expected mode');

  var newFlags;
  if (mode === 'default') {
    newFlags = userDefaultFlagsService.getDefaultFlagsForUser(user);
  } else {
    newFlags = roomMembershipFlags.getFlagsForMode(mode, false);
  }

  var userId = user._id;

  return roomMembershipService.setMembershipFlags(userId, roomId, newFlags);
}

exports.setModeForUserInRoom = Promise.method(setModeForUserInRoom);
