'use strict';

var env = require('gitter-web-env');
var errorReporter = env.errorReporter;

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  var iosGateway = require('gitter-web-push-gateways/lib/ios/ios-notification-gateway');
  var pushNotificationService = require('gitter-web-push-notifications');

  var feedbackEmitter = iosGateway.createFeedbackEmitter();

  feedbackEmitter.on('deregister', function(deviceTokens) {
    return pushNotificationService.deregisterIosDevices(deviceTokens).catch(function(err) {
      errorReporter(err, {}, { module: 'apn-feedback-listener' });
    });
  });
};
