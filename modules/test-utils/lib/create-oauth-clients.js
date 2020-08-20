'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:tests:test-fixtures');
var crypto = require('crypto');
var fixtureUtils = require('./fixture-utils');
var OAuthClient = require('gitter-web-persistence').OAuthClient;

function createOAuthClient(fixtureName, f) {
  debug('Creating %s', fixtureName);

  var name = f.name || fixtureUtils.generateName();

  return OAuthClient.create({
    name: name,
    clientKey: f.clientKey || crypto.randomBytes(20).toString('hex'),
    clientSecret: f.clientSecret || crypto.randomBytes(20).toString('hex'),
    registeredRedirectUri: f.registeredRedirectUri,
    revoked: f.revoked || false,
    ownerUserId: f.ownerUserId
  });
}

function createOAuthClients(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^oAuthClient/)) {
      var expectedOAuthClient = expected[key];

      if (expectedOAuthClient.ownerUser) {
        expectedOAuthClient.ownerUserId = fixture[expectedOAuthClient.ownerUser]._id;
      }

      return createOAuthClient(key, expectedOAuthClient).then(function(oAuthClient) {
        fixture[key] = oAuthClient;
      });
    }

    return null;
  });
}

module.exports = createOAuthClients;
