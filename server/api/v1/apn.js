'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var pushNotificationService = require('gitter-web-push-notifications');

module.exports = function(req, res, next) {
  var deviceId = req.body.deviceId;
  var deviceName = req.body.deviceName;
  var deviceType = req.body.deviceType;
  var deviceToken = new Buffer(req.body.deviceToken, 'base64');
  var appVersion = req.body.version || null;
  var appBuild = req.body.build || null;

  winston.info('APN device registration', {
    deviceId: deviceId,
    deviceName: deviceName,
    deviceType: deviceType
  });

  return pushNotificationService
    .registerDevice(deviceId, deviceType, deviceToken, deviceName, appVersion, appBuild)
    .then(function() {
      res.send({ success: true });
    })
    .catch(next);
};
