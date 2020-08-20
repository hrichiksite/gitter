'use strict';

var logger = require('gitter-web-env').logger;
var pushNotificationService = require('gitter-web-push-notifications');

module.exports = function(req, res, next) {
  var deviceId = req.body.deviceId;
  var deviceName = req.body.deviceName;
  var registrationId = req.body.registrationId;
  var appVersion = req.body.version;
  var userId = req.user.id;

  logger.info('GCM device registration', { deviceId: deviceId, deviceName: deviceName });

  return pushNotificationService
    .registerAndroidDevice(deviceId, deviceName, registrationId, appVersion, userId)
    .then(function() {
      res.send({ success: true });
    })
    .catch(next);
};
