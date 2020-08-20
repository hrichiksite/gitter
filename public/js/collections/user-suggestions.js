'use strict';

var Backbone = require('backbone');
var apiClient = require('../components/api-client');
var SyncMixin = require('./sync-mixin');

var UserSuggestionCollection = Backbone.Collection.extend({
  url: apiClient.priv.channelGenerator('/inviteUserSuggestions'),
  sync: SyncMixin.sync
});

module.exports = UserSuggestionCollection;
