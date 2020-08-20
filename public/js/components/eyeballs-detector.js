'use strict';

var _ = require('lodash');
var Backbone = require('backbone');
var debug = require('debug-proxy')('app:eyeballs:detector');
var EyeballsActivity = require('./eyeballs-activity');
var EyeballsFocus = require('./eyeballs-focus');
var EyeballsVisibility = require('./eyeballs-visibility');

var events = {};
_.extend(events, Backbone.Events);

var hasVisibility = true;
var hasFocus = true;
var hasActivity = true;
var eyesOnState = true;

function update() {
  var newValue = hasVisibility && hasFocus && hasActivity;
  if (newValue === eyesOnState) return;
  eyesOnState = newValue;

  debug('Eyeballs change: %s', newValue);
  events.trigger('change', eyesOnState);
}

var activityMonitor = new EyeballsActivity(function(signal) {
  debug('Activity signal: %s', signal);

  hasActivity = signal;
  update();
});

new EyeballsVisibility(function(signal) {
  debug('Visibility signal: %s', signal);
  hasVisibility = signal;
  update();
});

new EyeballsFocus(function(signal) {
  debug('Focus signal: %s', signal);

  hasFocus = signal;
  if (signal) {
    // Focus means the user is active...
    activityMonitor.setInactive(false);
  } else {
    activityMonitor.setInactive(true);
  }
  update();
});

function getEyeballs() {
  return eyesOnState;
}

function forceActivity() {
  activityMonitor.setInactive(false);
}

module.exports = {
  getEyeballs: getEyeballs,
  forceActivity: forceActivity,
  events: events
};
