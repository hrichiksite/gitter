'use strict';

var handler = require('./handler');

var idSeq = 0;

function extractPayload(event) {
  try {
    var data = event && event.data && event.data.json();
    if (!data) return;

    data.uniqueId = ++idSeq + ':' + Date.now();
    return data;
  } catch (e) {
    return;
  }
}

self.addEventListener('push', function(event) {
  var payload = extractPayload(event);
  if (!payload) return;

  var promise = handler.onPush(event, payload);
  if (promise) {
    event.waitUntil(promise);
  }
});

self.addEventListener('pushsubscriptionchange', function(/*event*/) {
  // TODO: important: implement this
});

self.addEventListener('notificationclick', function(event) {
  var promise = handler.onNotificationClick(event);
  if (promise) {
    event.waitUntil(promise);
  }
});

self.addEventListener('notificationclose', function(/*event*/) {
  // Do we want to do something here?
});

self.addEventListener('fetch', async () => {
  // This is a dumb fetch listener just for the homescreen install requirements.
  // https://web.dev/install-criteria/
  // We don't cache anything here yet
  return;
});
