'use strict';

var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var async = require('async');
var assert = require('assert');

module.exports = function(underTest) {
  describe('non-anonymous', function() {
    var userId, clientId, token, tokens;

    beforeEach(function() {
      userId = mongoUtils.getNewObjectIdString() + '';
      clientId = mongoUtils.getNewObjectIdString() + '';
      token = 'test' + Math.random() + Date.now();
      tokens = [token];
    });

    afterEach(function(done) {
      async.each(
        tokens,
        function(token, callback) {
          if (token) {
            underTest.deleteToken(token, callback);
          } else {
            callback();
          }
        },
        done
      );
    });

    it('should not find tokens that do not exist', function(done) {
      underTest.getToken(userId, clientId, function(err, token) {
        if (err) return done(err);
        assert(!token);
        done();
      });
    });

    it('should not validate tokens that do not exist', function(done) {
      underTest.validateToken(token, function(err, userClient) {
        if (err) return done(err);
        assert(!userClient);
        done();
      });
    });

    it('should find tokens that have been cached', function(done) {
      underTest.cacheToken(userId, clientId, token, function(err) {
        if (err) return done(err);

        underTest.getToken(userId, clientId, function(err, token2) {
          if (err) return done(err);
          tokens.push(token2);
          assert.strictEqual(token, token2);

          underTest.validateToken(token, function(err, userClient) {
            if (err) return done(err);

            assert(Array.isArray(userClient));
            // Deep equals freaks out with mongo ids
            assert.strictEqual(userId, userClient[0]);
            assert.strictEqual(clientId, userClient[1]);
            done();
          });
        });
      });
    });

    it('should not find tokens that have been deleted', function(done) {
      underTest.cacheToken(userId, clientId, token, function(err) {
        if (err) return done(err);

        underTest.deleteToken(token, function(err) {
          if (err) return done(err);

          underTest.getToken(userId, clientId, function(err, token2) {
            if (err) return done(err);
            tokens.push(token2);

            assert(!token2);

            underTest.validateToken(token, function(err, userClient) {
              if (err) return done(err);
              assert(!userClient);
              done();
            });
          });
        });
      });
    });
  });

  describe('anonymous', function() {
    var clientId, token;

    beforeEach(function() {
      clientId = mongoUtils.getNewObjectIdString() + '';
      token = 'test' + Math.random() + Date.now();
    });

    it('should not find tokens for anonymous users', function(done) {
      underTest.getToken(null, clientId, function(err, token) {
        if (err) return done(err);
        assert(!token);
        done();
      });
    });

    it('should find tokens that have been cached', function(done) {
      underTest.cacheToken(null, clientId, token, function(err) {
        if (err) return done(err);

        underTest.validateToken(token, function(err, userClient) {
          if (err) return done(err);

          assert(Array.isArray(userClient));
          // Deep equals freaks out with mongo ids
          assert.strictEqual(null, userClient[0]);
          assert.strictEqual(clientId, userClient[1]);
          done();
        });
      });
    });

    it('should not find tokens that have been deleted', function(done) {
      underTest.cacheToken(null, clientId, token, function(err) {
        if (err) return done(err);

        underTest.deleteToken(token, function(err) {
          if (err) return done(err);

          underTest.validateToken(token, function(err, userClient) {
            if (err) return done(err);
            assert(!userClient);
            done();
          });
        });
      });
    });
  });
};
