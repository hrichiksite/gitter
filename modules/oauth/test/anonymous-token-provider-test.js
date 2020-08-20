'use strict';

var anonymousTokenProvider = require('../lib/tokens/anonymous-token-provider');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');

describe('anonymous-token-provider', function() {
  describe('anonymous', function() {
    var clientId;

    beforeEach(function() {
      clientId = mongoUtils.getNewObjectIdString() + '';
    });

    it('should not validate invalid tokens', function(done) {
      anonymousTokenProvider.validateToken('$3219128309128301289301283912098312038', function(
        err,
        token
      ) {
        if (err) return done(err);
        assert(!token);
        done();
      });
    });

    it('should find tokens that have been cached', function(done) {
      anonymousTokenProvider.getToken(null, clientId, function(err, token) {
        if (err) return done(err);
        anonymousTokenProvider.validateToken(token, function(err, userClient) {
          if (err) return done(err);

          assert(Array.isArray(userClient));
          // Deep equals freaks out with mongo ids
          assert.strictEqual(null, userClient[0]);
          assert.strictEqual(clientId, userClient[1]);
          done();
        });
      });
    });
  });
});
