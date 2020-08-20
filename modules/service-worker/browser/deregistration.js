'use strict';

var Promise = require('bluebird');
var supportsWebPush = require('./supports-web-push');

function uninstall() {
  if (!supportsWebPush()) {
    return false;
  }

  if (!navigator.serviceWorker.controller) return false;

  return Promise.resolve(navigator.serviceWorker.ready)
    .then(function(registration) {
      if (!registration) return false;
      return registration.pushManager.getSubscription();
    })
    .then(function(subscription) {
      if (!subscription) return false;
      return subscription.unsubscribe();
    });
}

module.exports = {
  uninstall: Promise.method(uninstall)
};
