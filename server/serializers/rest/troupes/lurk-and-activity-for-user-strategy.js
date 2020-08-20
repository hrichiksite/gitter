'use strict';

var unreadItemService = require('gitter-web-unread-items');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var _ = require('lodash');

function LurkAndActivityForUserStrategy(options) {
  this.currentUserId = options.currentUserId;
  this.roomsWithLurk = null;
  this.activity = null;
}

LurkAndActivityForUserStrategy.prototype = {
  preload: function() {
    return roomMembershipService
      .findLurkingRoomIdsForUserId(this.currentUserId)
      .bind(this)
      .then(function(troupeIds) {
        // Map the lurkers
        this.roomsWithLurk = _.reduce(
          troupeIds,
          function(memo, troupeId) {
            memo[troupeId] = true;
            return memo;
          },
          {}
        );

        // Map the activity indicators
        return unreadItemService.getActivityIndicatorForTroupeIds(troupeIds, this.currentUserId);
      })
      .then(function(values) {
        this.activity = values;
      });
  },

  mapLurkStatus: function(roomId) {
    return this.roomsWithLurk[roomId] || false;
  },

  mapActivity: function(roomId) {
    return this.activity[roomId];
  },

  name: 'LurkAndActivityForUserStrategy'
};

module.exports = LurkAndActivityForUserStrategy;
