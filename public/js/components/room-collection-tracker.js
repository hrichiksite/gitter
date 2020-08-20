'use strict';

var appEvents = require('../utils/appevents');
var urlParser = require('../utils/url-parser');

function RoomCollectionTracker(collection) {
  this.collection = collection;
  this.current = null;
  this.currentSelector = null;

  appEvents.on('context.troupeId', this.onContextChange, this);
  appEvents.on('navigation', this.onNavigate, this);

  collection.on('add', this.onAdd, this);
  collection.on('reset', this.onReset, this);

  var parsed = urlParser.parse(window.location.href);
  this.setSelectedRoom({ url: parsed.pathname });
}

RoomCollectionTracker.prototype = {
  setSelectedRoom: function(selector) {
    var selectedRoomModel = selector.url
      ? this.collection.findWhere({ url: selector.url })
      : this.collection.get(selector.id);

    if (selectedRoomModel && this.current === selectedRoomModel) return;
    if (this.current) {
      this.current.set('currentRoom', false);
    }

    this.current = selectedRoomModel;
    this.currentSelector = selector;

    if (selectedRoomModel) {
      selectedRoomModel.set('currentRoom', true);
    }
  },

  onAdd: function(model) {
    if (!this.currentSelector) return;
    if (
      (this.currentSelector.url && model.get('url') === this.currentSelector.url) ||
      (this.currentSelector.id && model.id === this.currentSelector.id)
    ) {
      this.current = model;
      model.set('currentRoom', true);
    }
  },

  onReset: function() {
    if (!this.currentSelector) return;
    this.setSelectedRoom(this.currentSelector);
  },

  onNavigate: function(url) {
    var parsed = urlParser.parse(url);
    this.setSelectedRoom({ url: parsed.pathname });
  },

  onContextChange: function(roomId) {
    this.setSelectedRoom({ id: roomId });
  }
};

module.exports = RoomCollectionTracker;
