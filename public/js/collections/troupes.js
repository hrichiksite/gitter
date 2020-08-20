'use strict';

var context = require('gitter-web-client-context');
var realtime = require('../components/realtime');
var gitterRealtimeClient = require('gitter-realtime-client');
var SyncMixin = require('./sync-mixin');

var RoomModel = gitterRealtimeClient.RoomModel.extend({
  sync: SyncMixin.sync
});

var TroupeCollection = gitterRealtimeClient.RoomCollection.extend({
  model: RoomModel,
  urlTemplate: '/v1/user/:userId/rooms',
  contextModel: context.contextModel(),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  TroupeCollection: TroupeCollection,
  TroupeModel: RoomModel
};
