'use strict';

var tokenProvider = require('../lib/tokens/index');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');

describe('token-provider', function() {
  require('./provider-tests-common-full')(tokenProvider, true);

  describe('anonymous', function() {
    var clientId;

    beforeEach(function() {
      clientId = mongoUtils.getNewObjectIdString() + '';
    });

    it('should create tokens for user-clients that do not exist', function(done) {
      tokenProvider.getToken(null, clientId, function(err, token) {
        if (err) return done(err);
        assert(token);
        done();
      });
    });

    it('should find tokens that have been cached', function(done) {
      tokenProvider.getToken(null, clientId, function(err, token2) {
        if (err) return done(err);
        assert(token2);
        done();
      });
    });

    it('should not reuse the same tokens', function(done) {
      tokenProvider.getToken(null, clientId, function(err, token2) {
        if (err) return done(err);

        tokenProvider.getToken(null, clientId, function(err, token3) {
          if (err) return done(err);
          assert.notEqual(token2, token3);
          done();
        });
      });
    });
  });
});
