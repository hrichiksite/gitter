'use strict';

var context = require('gitter-web-client-context');
var appEvents = require('../utils/appevents');
var ravenClientFactory = require('gitter-web-client-error-reporting/lib/raven-client-factory');

var REPORT_UNHANDLED_REJECTIONS = true;

var user = context.user();

var ravenClient = ravenClientFactory({
  username: user && user.get('username'),
  // We handle this ourselves just below (see reasoning below)
  // TODO: We can re-enable built-in raven handling when there is a new Bluebird release, tracked by https://github.com/petkaantonov/bluebird/issues/1509
  captureUnhandledRejections: false
});

if (REPORT_UNHANDLED_REJECTIONS) {
  // We handle this ourselves because Bluebird doesn't implement PromiseRejectionEvent correctly(spec-compliant)
  // TODO: This handler can be removed when there is a new Bluebird release, tracked by https://github.com/petkaantonov/bluebird/issues/1509
  window.addEventListener('unhandledrejection', function(e) {
    // `e.detail.reason` is bluebird
    // `e.reason` is native PromiseRejectionEvent, https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent/reason
    var reason = e.detail ? e.detail.reason : e.reason;
    ravenClient(reason);
  });
}

appEvents.on('bugreport', function(description, data) {
  appEvents.trigger('stats.event', 'error');
  ravenClient(description, data);
});
