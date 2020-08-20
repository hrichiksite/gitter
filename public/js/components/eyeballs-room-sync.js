'use strict';

var context = require('gitter-web-client-context');
var apiClient = require('./api-client');
var localStore = require('./local-store');
var realtime = require('./realtime');
var realtimePresenceTracking = require('./realtime-presence-tracking');
var appEvents = require('../utils/appevents');
var debug = require('debug-proxy')('app:eyeballs:room-sync');
var eyeballsDetector = require('./eyeballs-detector');

// Tell realtime signals to report on presence
realtimePresenceTracking.track();

function send(value) {
  if (localStore.get('gitterNoEyeballSignals')) return;

  if (!context.getTroupeId()) {
    return;
  }

  var clientId = realtime.getClientId();

  if (!clientId) {
    return;
  }

  apiClient
    .post(
      '/v1/eyeballs',
      {
        socketId: clientId,
        on: value
      },
      {
        dataType: 'text',
        global: false
      }
    )
    .catch(function(err) {
      if (err.status === 400) {
        // The connection is gone...
        debug('Eyeballs returned 400. Realtime connection may be dead.');
        appEvents.trigger('eyeballsInvalid', clientId);
      } else {
        debug('An error occurred while communicating eyeballs');
      }
    });
}

appEvents.on('change:room', function() {
  eyeballsDetector.forceActivity();
});

eyeballsDetector.events.on('change', function(state) {
  send(state);
});
