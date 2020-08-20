'use strict';

/**
 * Detect when the server version differs from the client version, await a timeout
 * and after the timeout period force a refresh of the browser when the user
 * isn't looking and the browser is online.
 */

var clientEnv = require('gitter-client-env');
var currentVersion = clientEnv['version'];
var debug = require('debug-proxy')('app:reload-on-update');
var ConditionalDebouncer = require('../utils/conditional-debouncer');
var eyeballsDetector = require('./eyeballs-detector');

var RELOAD_MIN_MINUTES = 30; /* Shortest restart will happen after this duration */
var RELOAD_MAX_MINUTES = 60; /* Longest restart will happen after this duration */
var TIME_BEFORE_RELOAD = 2 * 60 * 1000; /* 2 minutes */

var reloadCountdownTimer;
var reloadListener;

function getRandomReloadPeriod() {
  return Math.round(
    (RELOAD_MIN_MINUTES + Math.random() * (RELOAD_MAX_MINUTES - RELOAD_MIN_MINUTES)) * 60 * 1000
  );
}

/**
 * Reload now
 */
function reloadNow() {
  debug("The time has come. To say fair's fair. To pay the rent. To pay our share.");
  window.location.reload(true);
}

/**
 * The reload listener listens to all the things that could
 * cancel a reload and postpones the reload until all conditions are
 * go
 */
function ReloadListener() {
  this.onlineChangeBound = this.onlineChange.bind(this);
  this.eyeballsChangeBound = this.eyeballsChange.bind(this);

  this.listen();
}

ReloadListener.prototype = {
  listen: function() {
    var conditions = {
      eyeballsOff: !eyeballsDetector.getEyeballs()
    };

    // If the browser supports onLine...
    if (Navigator.prototype.hasOwnProperty('onLine')) {
      conditions.online = window.navigator.onLine;
      window.addEventListener('online', this.onlineChangeBound);
      window.addEventListener('offline', this.onlineChangeBound);
    }

    eyeballsDetector.events.on('change', this.eyeballsChangeBound);

    this.conditionalDebouncer = new ConditionalDebouncer(conditions, TIME_BEFORE_RELOAD, reloadNow);
  },

  onlineChange: function(e) {
    if (!this.conditionalDebouncer) return;
    var isOnline = e.type === 'online';
    this.conditionalDebouncer.set('online', isOnline);
  },

  eyeballsChange: function(eyeballsStatus) {
    if (!this.conditionalDebouncer) return;
    this.conditionalDebouncer.set('eyeballsOff', !eyeballsStatus);
  },

  destroy: function() {
    this.conditionalDebouncer.cancel();
    this.conditionalDebouncer = null;

    if (Navigator.prototype.hasOwnProperty('onLine')) {
      window.removeEventListener('online', this.onlineChangeBound);
      window.removeEventListener('offline', this.onlineChangeBound);
    }

    eyeballsDetector.events.off('change', this.eyeballsChangeBound);
  }
};

/**
 * Wait for a timeout before forcing the user to upgrade
 */
function startReloadTimer() {
  if (reloadCountdownTimer || reloadListener) return;
  var timeMs = getRandomReloadPeriod();
  debug('Application version mismatch. Will restart after %s ms', timeMs);

  // Ensure that the deployment has definitely completely before
  // we start trying to reload
  reloadCountdownTimer = setTimeout(function() {
    if (reloadListener) return;
    reloadListener = new ReloadListener();
  }, timeMs);
}

/**
 * Cancel the reload countdown
 */
function cancelReload() {
  if (reloadCountdownTimer) {
    clearTimeout(reloadCountdownTimer);
    reloadCountdownTimer = null;
  }

  if (reloadListener) {
    reloadListener.destroy();
    reloadListener = null;
  }
}

function reportServerVersion(version) {
  if (version === currentVersion) {
    // Odd
    cancelReload();
  } else {
    // App version has changed,
    // start the countdown
    startReloadTimer();
  }
}

module.exports = {
  reportServerVersion: reportServerVersion
};
