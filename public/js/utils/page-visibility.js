'use strict';

var _ = require('lodash');
var Backbone = require('backbone');

var events = {};
_.extend(events, Backbone.Events);

var PREFIXES = ['moz', 'ms', 'webkit'];

function findPrefix() {
  if (typeof document.hidden !== 'undefined') {
    // Opera 12.10 and Firefox 18 and later support
    return {
      prop: 'hidden',
      eventName: 'visibilitychange'
    };
  }

  for (var i = 0; i < PREFIXES.length; i++) {
    var prefix = PREFIXES[i];
    if (typeof document[prefix + 'Hidden'] !== 'undefined') {
      return {
        prop: prefix + 'Hidden',
        eventName: prefix + 'visibilitychange'
      };
    }
  }
}

var prefix = findPrefix();
var prop = prefix && prefix.prop;
var eventName = prefix && prefix.eventName;

function handleVisibilityChange() {
  events.trigger('change');
}

function isHidden() {
  if (!prop) return undefined;
  return document[prop];
}

if (eventName) {
  document.addEventListener(eventName, handleVisibilityChange, false);
}

module.exports = {
  events: events,
  isHidden: isHidden
};
