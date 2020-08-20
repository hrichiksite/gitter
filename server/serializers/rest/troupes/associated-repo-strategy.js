'use strict';

var roomRepoService = require('gitter-web-rooms/lib/room-repo-service');

function AssociatedRepoStrategy(/*options*/) {
  this.associatedRepos = null;
}

AssociatedRepoStrategy.prototype = {
  preload: function(items) {
    return roomRepoService
      .findAssociatedGithubRepoForRooms(items.toArray())
      .bind(this)
      .then(function(results) {
        this.associatedRepos = results;
      });
  },

  map: function(item) {
    return this.associatedRepos[item.id || item._id] || false;
  },

  name: 'AssociatedRepoStrategy'
};

module.exports = AssociatedRepoStrategy;
