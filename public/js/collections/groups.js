'use strict';

var Backbone = require('backbone');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('../components/realtime');
var SyncMixin = require('./sync-mixin');
var context = require('gitter-web-client-context');

var GroupModel = Backbone.Model.extend({
  defaults: {
    name: '',
    uri: '',
    type: 'org',
    linkPath: null,
    defaultRoomName: 'community',
    unreadItems: false,
    mentions: false,
    activity: false,
    favourite: null
  },
  sync: SyncMixin.sync
});

var GroupCollection = LiveCollection.extend({
  model: GroupModel,
  urlTemplate: '/v1/user/:userId/groups',
  contextModel: context.contextModel(),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync,

  initialize: function() {
    this.listenTo(this, 'change:favourite', this.reorderFavs);
  },

  reorderFavs: function(model) {
    /**
     * We need to do some special reordering in the model of a favourite being positioned
     * This is to mirror the changes happening on the server
     * @see recent-room-service.js@addTroupeAsFavouriteInPosition
     */

    /* This only applies when a fav has been set */
    if (!model.changed || !model.changed.favourite || this.reordering) {
      return;
    }

    this.reordering = true;

    var favourite = model.changed.favourite;

    var forUpdate = this.map(function(room) {
      return { id: room.id, favourite: room.get('favourite') };
    }).filter(function(room) {
      return room.favourite >= favourite && room.id !== model.id;
    });

    forUpdate.sort(function(a, b) {
      return a.favourite - b.favourite;
    });

    var next = favourite;
    for (var i = 0; i < forUpdate.length; i++) {
      var item = forUpdate[i];

      if (item.favourite > next) {
        forUpdate.splice(i, forUpdate.length);
        break;
      }

      item.favourite++;
      next = item.favourite;
    }

    var self = this;
    for (var j = forUpdate.length - 1; j >= 0; j--) {
      var r = forUpdate[j];
      var id = r.id;
      var value = r.favourite;
      var t = self.get(id);
      t.set('favourite', value, { silent: true });
    }

    delete this.reordering;
  }
});

module.exports = {
  Model: GroupModel,
  Collection: GroupCollection
};
