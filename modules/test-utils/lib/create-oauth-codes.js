'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:tests:test-fixtures');
var crypto = require('crypto');
var OAuthCode = require('gitter-web-persistence').OAuthCode;

function createOAuthCode(fixtureName, f) {
  debug('Creating %s', fixtureName);

  return OAuthCode.create({
    code: f.code || crypto.randomBytes(20).toString('hex'),
    clientId: f.clientId,
    redirectUri: f.redirectUri,
    userId: f.userId
  });
}

function createOAuthCodes(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^oAuthCode/)) {
      const expectedOAuthCode = expected[key];
      expectedOAuthCode.userId = fixture[expectedOAuthCode.user]._id;
      expectedOAuthCode.clientId = fixture[expectedOAuthCode.client]._id;
      expectedOAuthCode.redirectUri = fixture[expectedOAuthCode.client].registeredRedirectUri;

      return createOAuthCode(key, expectedOAuthCode).then(function(oAuthCode) {
        fixture[key] = oAuthCode;
      });
    }

    return null;
  });
}

module.exports = createOAuthCodes;
