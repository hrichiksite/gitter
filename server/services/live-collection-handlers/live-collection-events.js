'use strict';

var _ = require('lodash');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');

function serializeEventToRoom(operation, event) {
  var url = '/rooms/' + event.toTroupeId + '/events';
  var strategy = new restSerializer.EventStrategy();

  return restSerializer.serializeObject(event, strategy).then(function(serializedEvent) {
    appEvents.dataChange2(url, operation, serializedEvent, 'event');
  });
}

module.exports = {
  create: function(event) {
    return serializeEventToRoom('create', event);
  },

  update: function(event) {
    return serializeEventToRoom('update', event);
  },

  patch: function(eventId, troupeId, patch) {
    var url = '/rooms/' + troupeId + '/events';
    appEvents.dataChange2(url, 'patch', _.extend({}, patch, { id: eventId }), 'event');
  },

  remove: function(event) {
    return this.removeId(event._id, event.toTroupeId);
  },

  removeId: function(eventId, troupeId) {
    var url = '/rooms/' + troupeId + '/events';
    appEvents.dataChange2(url, 'remove', { id: eventId }, 'event');
  }
};
