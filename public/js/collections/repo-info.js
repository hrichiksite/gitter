'use strict';

var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');

var Model = Backbone.Model.extend({
  url: '/v1/repo-info',
  sync: SyncMixin.sync
});

module.exports = Model;
