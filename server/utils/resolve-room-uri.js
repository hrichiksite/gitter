'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var User = require('gitter-web-persistence').User;

/**
 * Given a room and the current user, returns the URI of the room
 */
function resolveRoomUri(room, currentUserId) {
  if (!room.oneToOne) return '/' + room.uri;

  // The rest of the logic is for one-to-one rooms
  if (!currentUserId || !room.oneToOneUsers || room.oneToOneUsers.length !== 2) {
    throw new StatusError(404);
  }

  var currentUserIdString = String(currentUserId);

  var currentUser = room.oneToOneUsers.filter(function(f) {
    return String(f.userId) === currentUserIdString;
  })[0];

  var otherUser = room.oneToOneUsers.filter(function(f) {
    return String(f.userId) !== currentUserIdString;
  })[0];

  // This one-to-one does not belong to the current user
  if (!currentUser || !otherUser) {
    throw new StatusError(404);
  }

  return User.findById(otherUser.userId)
    .select({ username: 1, _id: 1 })
    .lean()
    .exec()
    .then(function(user) {
      if (!user || !user.username) throw new StatusError(404);
      return '/' + user.username;
    });
}

module.exports = Promise.method(resolveRoomUri);
