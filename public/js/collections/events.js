'use strict';

var moment = require('moment');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('../components/realtime');
var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');
var context = require('gitter-web-client-context');

var EventModel = Backbone.Model.extend({
  idAttribute: 'id',
  parse: function(message) {
    if (message.sent) {
      message.sent = moment(message.sent, moment.defaultFormat);
    }

    return message;
  }
});

var EventCollection = LiveCollection.extend({
  model: EventModel,
  initialize: function() {
    this.listenTo(this, 'add reset', this.trim);
  },
  client: function() {
    return realtime.getClient();
  },
  trim: function() {
    while (this.length > 20) {
      this.pop();
    }
  },
  modelName: 'event',
  urlTemplate: '/v1/rooms/:troupeId/events',
  contextModel: context.delayedContextModel(2000),
  comparator: function(e1, e2) {
    var s1 = e1.get('sent');
    var s2 = e2.get('sent');
    if (!s2) {
      if (!s1) return 0;
      return 1; // null > value
    }
    if (!s1) return -1;
    return s2.valueOf() - s1.valueOf();
  },
  sync: SyncMixin.sync
});

module.exports = {
  EventModel: EventModel,
  EventCollection: EventCollection
};
