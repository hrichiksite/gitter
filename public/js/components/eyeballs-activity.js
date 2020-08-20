'use strict';

var _ = require('lodash');
var passiveEventListener = require('../utils/passive-event-listener');

var INACTIVITY = 60 * 1000; /* One minute */
var INACTIVITY_POLL = 10 * 1000; /* 10 seconds */

function EyeballsActivity(callback) {
  this._callback = callback;
  this._inactivityTimer = null;
  this.inactive = null;
  this._lastUserInteraction = null;

  var debouncedInteractionTracking = _.debounce(this._registerInteraction.bind(this), 500);

  passiveEventListener.addEventListener(document, 'keydown', debouncedInteractionTracking);
  passiveEventListener.addEventListener(document, 'mousemove', debouncedInteractionTracking);
  passiveEventListener.addEventListener(document, 'touchstart', debouncedInteractionTracking);
  passiveEventListener.addEventListener(window, 'scroll', debouncedInteractionTracking);

  // Default to there being activity
  this.setInactive(false);
}

EyeballsActivity.prototype.setInactive = function(isInactive) {
  if (this.inactive === isInactive) return;
  this.inactive = isInactive;

  if (isInactive) {
    this._stopInactivityPoller();
  } else {
    this._lastUserInteraction = Date.now();
    this._startInactivityPoller();
  }

  this._callback(!isInactive);
};

/**
 * The user did something
 */
EyeballsActivity.prototype._registerInteraction = function() {
  this.setInactive(false);
};

/**
 * This timer occasionally checks whether the user has performed any
 * interactions since the last time it was called.
 * While being careful to deal with the computer sleeping
 */
EyeballsActivity.prototype._startInactivityPoller = function() {
  var self = this;

  if (self._inactivityTimer) return;
  self._inactivityTimer = setInterval(function() {
    // This is a long timeout, so it could possibly be delayed by
    // the user pausing the application. Therefore just wait for one
    // more period for activity to start again...

    setTimeout(function() {
      if (Date.now() - self._lastUserInteraction > INACTIVITY - INACTIVITY_POLL) {
        self.setInactive(true);
      }
    }, 5);
  }, INACTIVITY_POLL);
};

EyeballsActivity.prototype._stopInactivityPoller = function() {
  if (!this._inactivityTimer) return;
  clearTimeout(this._inactivityTimer);
  this._inactivityTimer = null;
};

module.exports = EyeballsActivity;
