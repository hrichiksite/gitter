'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('permissions');
var assert = require('assert');
var TroupeInvite = require('gitter-web-persistence').TroupeInvite;
var memoizePromise = require('./memoize-promise');
var Promise = require('bluebird');

/**
 * This context uses an invite to determine whether a user
 * can access a room
 */
function RoomInviteContextDelegate(userId, roomId, secret) {
  assert(userId, 'userId required');
  assert(roomId, 'roomId required');
  assert(secret, 'secret required');

  this.userId = userId;
  this.roomId = roomId;
  this.secret = secret;
}

RoomInviteContextDelegate.prototype = {
  isMember: memoizePromise('isMember', function() {
    return TroupeInvite.count({
      troupeId: this.roomId,
      secret: this.secret,
      $or: [
        {
          userId: null,
          state: 'PENDING'
        },
        {
          userId: this.userId,
          state: { $in: ['PENDING', 'REJECTED'] }
        }
      ]
    })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  }),

  handleReadAccessFailure: Promise.method(function() {
    // Access to the room was denied.
    logger.info('room-invite-context: user denied access to room', {
      userId: this.userId,
      roomId: this.roomId
    });
  })
};

module.exports = RoomInviteContextDelegate;
