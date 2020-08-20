'use strict';

var Promise = require('bluebird');
var identityService = require('gitter-web-identity');
var userCanJoinRoom = require('gitter-web-shared/rooms/user-can-join-room');
var StatusError = require('statuserror');

module.exports = Promise.method(function assertUserValidInRoom(room, existingUser) {
  // Don't bother loading in all the user's providers if the room allows all
  // providers anyway.
  if (!room.providers || !room.providers.length) return;

  if (!existingUser) {
    // TODO: in future, we should be able to add new members who are not
    // existing gitter users, but for now throw an error
    throw new StatusError(403, 'Unable to join room due to restriction in allowed members');
  }

  return identityService.listProvidersForUser(existingUser).then(function(userProviders) {
    var userValidInRoom = userCanJoinRoom(userProviders, room.providers);
    if (!userValidInRoom) {
      throw new StatusError(403, 'Unable to join room due to restriction in allowed members');
    }
  });
});
