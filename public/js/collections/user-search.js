'use strict';

var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');

var UserSearchModel = Backbone.Model.extend({
  idAttribute: 'id'
});

var UserSearchCollection = Backbone.Collection.extend({
  url: '/v1/user',
  model: UserSearchModel,
  parse: function(response) {
    //If we don't get any results make sure we return an empty array
    //this stops erroneous blank results being shown in typeaheads
    //jp 5/11/15
    return [].concat(response.results || []);
  },
  sync: SyncMixin.sync
});

module.exports = {
  Model: UserSearchModel,
  Collection: UserSearchCollection
};
