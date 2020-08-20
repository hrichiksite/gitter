'use strict';

var Backbone = require('backbone');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('../components/realtime');
var SyncMixin = require('./sync-mixin');
var context = require('gitter-web-client-context');

var OrgModel = Backbone.Model.extend({
  idAttribute: 'name' // Unusual...
});

var OrgCollection = LiveCollection.extend({
  model: OrgModel,
  urlTemplate: '/v1/user/:userId/orgs',
  contextModel: context.contextModel(),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  OrgCollection: OrgCollection,
  OrgModel: OrgModel
};
