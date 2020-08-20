'use strict';

var EVENT_LISTENERS = [
  './mongoose-events',
  './bayeux-events-bridge',
  './room-permissions-change-listener',
  './repo-rename-detected-listener',
  './notification-event-listener',
  './live-collection-events-listener',
  './room-membership-events',
  './destroy-user-tokens-listener',
  './room-membership-permission-check-failed',
  './apn-feedback-listener'
];

var installed = false;

exports.install = function() {
  if (installed) return;
  installed = true;

  EVENT_LISTENERS.forEach(function(module) {
    require(module).install();
  });
};
