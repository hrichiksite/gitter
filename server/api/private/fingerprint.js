'use strict';

const StatusError = require('statuserror');
var fingerprintingService = require('gitter-web-fingerprinting/lib/fingerprinting-service');

/**
 * Submit a browser fingerprint for a user's browser
 */
module.exports = function(req, res, next) {
  if (!req.user) return next(new StatusError(401, 'Anonymous users cannot be fingerprinted'));
  var userId = req.user._id;
  var fingerprint = req.body && req.body.fp;

  return fingerprintingService
    .recordFingerprint(userId, fingerprint, req.ip)
    .then(function() {
      res.send('OK');
    })
    .catch(next);
};
