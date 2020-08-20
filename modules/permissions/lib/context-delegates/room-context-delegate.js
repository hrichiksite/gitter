'use strict';

var assert = require('assert');
var persistence = require('gitter-web-persistence');
var memoizePromise = require('./memoize-promise');
var appEvents = require('gitter-web-appevents');

function RoomContextDelegate(userId, roomId) {
  assert(userId, 'userId required');
  assert(roomId, 'roomId required');

  this.userId = userId;
  this.roomId = roomId;
}

RoomContextDelegate.prototype = {
  isMember: memoizePromise('isMember', function() {
    return persistence.TroupeUser.count({ troupeId: this.roomId, userId: this.userId })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  }),

  /** Memoize is as it's possible that it will get called multiple times */
  handleReadAccessFailure: memoizePromise('handleReadAccessFailure', function() {
    return this.isMember()
      .bind(this)
      .then(function(isMember) {
        if (isMember) {
          // Remove the previous result
          // This is not perfect since the removal will occur asynchronously,
          // so we can't be absolutely sure that the next memoize call won't
          // happen before the removal is complete
          memoizePromise.unmemoize(this, 'isMember');
          return appEvents.roomMemberPermCheckFailed(this.roomId, this.userId);
        }

        return null;
      });
  })
};

module.exports = RoomContextDelegate;
