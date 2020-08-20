'use strict';

var assert = require('assert');
var persistence = require('gitter-web-persistence');
var memoizePromise = require('./memoize-promise');
var Promise = require('bluebird');

function OneToOneRoomContextDelegate(userId, roomId) {
  assert(userId, 'userId required');
  assert(roomId, 'roomId required');

  this.userId = userId;
  this.roomId = roomId;
}

OneToOneRoomContextDelegate.prototype = {
  isMember: memoizePromise('isMember', function() {
    return persistence.Troupe.count({ _id: this.roomId, 'oneToOneUsers.userId': this.userId })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  }),

  handleReadAccessFailure: Promise.method(function() {
    // This should never get called for a one-to-one room where the user is in
    // the room, so we ignore the failure
  })
};

module.exports = OneToOneRoomContextDelegate;
