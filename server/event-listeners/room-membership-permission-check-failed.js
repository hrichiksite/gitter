'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var errorReporter = env.errorReporter;
var appEvents = require('gitter-web-appevents');
var roomService = require('gitter-web-rooms');

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  appEvents.onRoomMemberPermCheckFailed(function(roomId, userId) {
    // This person no longer actually has access. Remove them!
    return roomService
      .removeRoomMemberById(roomId, userId)
      .then(function() {
        stats.event('membership_perm_check_failed', { roomId: roomId, userId: userId });
      })
      .catch(function(err) {
        errorReporter(err, { unreadItemsFailed: true }, { module: 'room-membership-events' });
      })
      .done();
  });
};
