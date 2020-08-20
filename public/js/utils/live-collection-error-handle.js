'use strict';

var log = require('./log');
var appEvents = require('./appevents');

module.exports = function(collectionName, collection, error) {
  appEvents.trigger('stats.event', 'live.collection.error');
  appEvents.trigger('stats.event', 'live.collection.error.' + collectionName);
  log.error(collectionName + ' live collection error', error);
};
