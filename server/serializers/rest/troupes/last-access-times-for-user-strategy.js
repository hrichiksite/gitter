'use strict';

var recentRoomCore = require('gitter-web-rooms/lib/recent-room-core');

function LastTroupeAccessTimesForUserStrategy(options) {
  this.userId = options.userId || options.currentUserId;
  this.timesIndexed = null;
}

LastTroupeAccessTimesForUserStrategy.prototype = {
  preload: function() {
    return recentRoomCore
      .getTroupeLastAccessTimesForUserExcludingHidden(this.userId)
      .bind(this)
      .then(function(times) {
        this.timesIndexed = times;
      });
  },

  map: function(id) {
    var time = this.timesIndexed[id];
    // No idea why, but sometimes these dates are converted to JSON as {}, hence the weirdness below
    return {
      troupeId: id,
      time: time ? new Date(time.valueOf()).toISOString() : undefined
    };
  },

  name: 'LastTroupeAccessTimesForUserStrategy'
};

module.exports = LastTroupeAccessTimesForUserStrategy;
