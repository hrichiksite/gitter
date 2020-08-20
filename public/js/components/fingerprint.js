'use strict';

var Promise = require('bluebird');
var apiClient = require('./api-client');
var cookies = require('../utils/cookies');

var MAX_FINGERPRINT_DURATION = 86400 * 1000; // one day

/**
 * Fingerprint the current browser
 */
function getFingerprint() {
  return new Promise(function(resolve) {
    require.ensure(['fingerprintjs2'], function(require) {
      var Fingerprint2 = require('fingerprintjs2');

      new Fingerprint2({}).get(function(result) {
        resolve(result);
      });
    });
  });
}

function fingerprintValid(fpCookie) {
  if (!fpCookie) return false;
  var parts = fpCookie.split(':');
  if (parts.length !== 2) return false;
  var time = parseInt(parts[0], 10);
  if (isNaN(time)) return false;
  var duration = Date.now() - time;
  if (duration < 0 || duration > MAX_FINGERPRINT_DURATION) return false;
  if (!parts[1]) return false;

  // TODO: possibly also check on the fingerprint
  return true;
}

function captureFingerprint() {
  var fingerprint = cookies.get('fp');

  if (fingerprintValid(fingerprint)) {
    return;
  }

  return getFingerprint()
    .tap(function(fingerprint) {
      return apiClient.priv.post(
        '/fp',
        { fp: fingerprint },
        {
          dataType: 'text',
          global: false
        }
      );
    })
    .tap(function(fingerprint) {
      cookies.set('fp', '' + Date.now() + ':' + fingerprint);
    });
}

module.exports = Promise.method(captureFingerprint);
