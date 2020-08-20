'use strict';

var accessTokenProvider = require('../lib/tokens/access-token-provider');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var assert = require('assert');

describe('access-token-provider', function() {
  require('./provider-tests-common-full')(accessTokenProvider);

  describe('idempotency #slow', function() {
    // Set to skip until this problematic test can be
    // sorted out. See https://github.com/troupe/gitter-webapp/issues/882
    // AN 25 Jan 2016
    it.skip('should be idempotent', function() {
      var userId = mongoUtils.getNewObjectIdString();
      var clientId = mongoUtils.getNewObjectIdString();

      return Promise.all([
        accessTokenProvider.getToken(userId, clientId),
        accessTokenProvider.getToken(userId, clientId),
        accessTokenProvider.getToken(userId, clientId),
        accessTokenProvider.getToken(userId, clientId),
        accessTokenProvider.getToken(userId, clientId)
      ]).then(function(items) {
        var firstToken = items[0];

        assert(
          items.every(function(token) {
            return token === firstToken;
          })
        );
      });
    });
  });
});
