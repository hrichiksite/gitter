'use strict';

function supportsWebPush() {
  if (!window.Uint8Array) return false;
  if (!('serviceWorker' in navigator)) return false;

  var ServiceWorkerRegistration = window.ServiceWorkerRegistration;
  if (!ServiceWorkerRegistration) return false;
  if (!('pushManager' in ServiceWorkerRegistration.prototype)) return false;

  return true;
}

module.exports = supportsWebPush;
