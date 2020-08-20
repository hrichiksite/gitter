'use strict';

var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

var rememberMeMiddleware = testRequire('./web/middlewares/rememberme-middleware');

describe('rememberme-middleware #slow', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    userNoTokens: {
      username: 'remembermetest' + Date.now(),
      githubToken: null
    }
  });

  it('should generate a token for a user', function() {
    return rememberMeMiddleware.testOnly
      .generateAuthToken(fixture.user1.id)
      .then(function(cookieValue) {
        assert(cookieValue);
      });
  });

  it('should validate a token for a user', function() {
    return rememberMeMiddleware.testOnly
      .generateAuthToken(fixture.user1.id)
      .then(function(cookieValue) {
        assert(cookieValue);

        return rememberMeMiddleware.testOnly.validateAuthToken(cookieValue);
      })
      .then(function(userId) {
        assert.strictEqual(userId, fixture.user1.id);
      });
  });

  it('should validate a token for a user twice in quick succession #slow', function() {
    rememberMeMiddleware.testOnly.setTokenGracePeriodMillis(100);

    return rememberMeMiddleware.testOnly
      .generateAuthToken(fixture.user1.id)
      .then(function(cookieValue) {
        assert(cookieValue);

        return rememberMeMiddleware.testOnly
          .validateAuthToken(cookieValue)
          .then(function(userId) {
            assert.strictEqual(userId, fixture.user1.id);

            return rememberMeMiddleware.testOnly.validateAuthToken(cookieValue);
          })
          .then(function(userId) {
            assert.strictEqual(userId, fixture.user1.id);
          })
          .delay(110) /* Wait for the token to expire */
          .then(function() {
            return rememberMeMiddleware.testOnly.validateAuthToken(cookieValue);
          })
          .then(function(userId) {
            assert(!userId);
          });
      });
  });

  it('should delete a token', function() {
    rememberMeMiddleware.testOnly.setTokenGracePeriodMillis(100);

    return rememberMeMiddleware.testOnly
      .generateAuthToken(fixture.user1.id)
      .bind({
        cookieValue: null
      })
      .then(function(cookieValue) {
        assert(cookieValue);
        this.cookieValue = cookieValue;

        return rememberMeMiddleware.testOnly.validateAuthToken(cookieValue);
      })
      .then(function(userId) {
        assert.strictEqual(userId, fixture.user1.id);

        return rememberMeMiddleware.testOnly.deleteAuthToken(this.cookieValue);
      })
      .then(function() {
        return rememberMeMiddleware.testOnly.validateAuthToken(this.cookieValue);
      })
      .then(function(userId) {
        assert(!userId);
      });
  });

  it('should handle bad keys', function() {
    return rememberMeMiddleware.testOnly
      .validateAuthToken('12312123123123123123123123:123123123123123123123123132123')
      .then(function(userId) {
        assert(!userId);
      });
  });

  describe('processRememberMeToken', function() {
    it('should cope with a missing user', function() {
      return rememberMeMiddleware.testOnly
        .generateAuthToken(new ObjectID())
        .then(function(cookieValue) {
          return rememberMeMiddleware.testOnly.processRememberMeToken(cookieValue);
        })
        .then(function(loginInfo) {
          assert(!loginInfo);
        });
    });

    it('should cope with a user without tokens', function() {
      return rememberMeMiddleware.testOnly
        .generateAuthToken(fixture.userNoTokens.id)
        .then(function(cookieValue) {
          return rememberMeMiddleware.testOnly.processRememberMeToken(cookieValue);
        })
        .then(function(loginInfo) {
          assert(!loginInfo);
        });
    });

    it('should authenticate with genuine tokens', function() {
      return rememberMeMiddleware.testOnly
        .generateAuthToken(fixture.user1.id)
        .then(function(cookieValue) {
          return rememberMeMiddleware.testOnly.processRememberMeToken(cookieValue);
        })
        .then(function(loginInfo) {
          assert.strictEqual(loginInfo.user.id, fixture.user1.id);
          assert(loginInfo.newCookieValue);
          return rememberMeMiddleware.testOnly.processRememberMeToken(loginInfo.newCookieValue);
        })
        .then(function(loginInfo) {
          assert.strictEqual(loginInfo.user.id, fixture.user1.id);
          assert(loginInfo.newCookieValue);
        });
    });

    it('should reject bad cookies', function() {
      return rememberMeMiddleware.testOnly
        .processRememberMeToken('123123123:asdasasdasdadasd')
        .then(function(loginInfo) {
          assert(!loginInfo);
        });
    });
  });
});
