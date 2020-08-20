'use strict';

var unreadItemService = require('gitter-web-unread-items');

function AllUnreadItemCountStrategy(options) {
  this.userId = options.userId || options.currentUserId;
  this.unreadCounts = null;
}

AllUnreadItemCountStrategy.prototype = {
  preload: function(troupeIds) {
    return unreadItemService
      .getUserUnreadCountsForTroupeIds(this.userId, troupeIds.toArray())
      .bind(this)
      .then(function(result) {
        this.unreadCounts = result;
      });
  },

  map: function(id) {
    var count = this.unreadCounts[id];
    return count || 0;
  },

  name: 'AllUnreadItemCountStrategy'
};

module.exports = AllUnreadItemCountStrategy;
