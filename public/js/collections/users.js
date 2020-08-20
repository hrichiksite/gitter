'use strict';

var Backbone = require('backbone');
var realtime = require('../components/realtime');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var SyncMixin = require('./sync-mixin');
var context = require('gitter-web-client-context');

var UserModel = Backbone.Model.extend({
  idAttribute: 'id',
  sync: SyncMixin.sync
});

var RosterCollection = LiveCollection.extend({
  model: UserModel,
  modelName: 'user',
  urlTemplate: '/v1/rooms/:troupeId/users',
  contextModel: context.delayedContextModel(1000),
  getSnapshotState: function() {
    return { lean: true, limit: 25 };
  },
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  RosterCollection: RosterCollection,
  UserModel: UserModel
};
