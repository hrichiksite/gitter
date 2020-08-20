'use strict';

var groupService = require('gitter-web-groups/lib/group-service');

// Based on ./server/serializers/rest/troupes/favourite-troupes-for-user-strategy.js
function FavouriteGroupsForUserStrategy(options) {
  this.userId = options && (options.userId || options.currentUserId);
  this.favs = null;
}

FavouriteGroupsForUserStrategy.prototype = {
  preload: function() {
    return groupService
      .findFavouriteGroupsForUser(this.userId)
      .bind(this)
      .then(function(favs) {
        this.favs = favs;
      });
  },

  map: function(id) {
    var favs = this.favs[id];
    if (!favs) return undefined;
    if (favs === '1') return 1000;
    return favs;
  },

  name: 'FavouriteGroupsForUserStrategy'
};

module.exports = FavouriteGroupsForUserStrategy;
