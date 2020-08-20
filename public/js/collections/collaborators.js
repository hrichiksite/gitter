'use strict';

var apiClient = require('../components/api-client');
var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');

var CollabModel = Backbone.Model.extend({
  idAttribute: 'id'
});

var CollabCollection = Backbone.Collection.extend({
  model: CollabModel,
  url: apiClient.room.channelGenerator('/collaborators'),
  sync: SyncMixin.sync
});

module.exports = {
  CollabCollection: CollabCollection,
  CollabModel: CollabModel
};
