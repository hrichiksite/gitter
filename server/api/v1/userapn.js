'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var pushNotificationService = require('gitter-web-push-notifications');

module.exports = function(req, res, next) {
  winston.info('APN user registration', { deviceId: req.body.deviceId, userId: req.user.id });

  return pushNotificationService
    .registerUser(req.body.deviceId, req.user.id)
    .then(function() {
      res.send({ success: true });
    })
    .catch(next);
};
