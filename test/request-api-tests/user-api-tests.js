'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('user-api', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setupEach({
    user1: {
      accessToken: 'web-internal'
    },
    user2: {},
    group1: {},
    troupe1: {
      security: 'PUBLIC',
      group: 'group1',
      users: ['user1', 'user2']
    },
    troupe2: {
      security: 'PUBLIC',
      group: 'group1',
      users: ['user2']
    }
  });

  it('GET /v1/user/:userId/suggestedRooms', function() {
    return request(app)
      .get('/v1/user/me/suggestedRooms')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        // For now, this is a very loose test, to prove
        // https://github.com/troupe/gitter-webapp/pull/2067
        // We can extend it later
        var suggestions = result.body;
        assert(Array.isArray(suggestions));
        assert(suggestions.length > 0);
        suggestions.forEach(function(suggestion) {
          assert(suggestion.hasOwnProperty('uri'));
          assert(suggestion.hasOwnProperty('avatarUrl'));
          assert(suggestion.hasOwnProperty('userCount'));
          assert(suggestion.hasOwnProperty('tags'));
          assert(suggestion.hasOwnProperty('description'));
          assert(suggestion.hasOwnProperty('exists'));
          assert(
            (suggestion.exists === true && suggestion.id) ||
              (suggestion.exists === false && !suggestion.id)
          );
        });
      });
  });

  describe('DELETE /v1/user/:userId', () => {
    it('should be successful', function() {
      return request(app)
        .delete('/v1/user/me')
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200)
        .then(function(result) {
          assert.strictEqual(result.status, 200);
          assert.deepEqual(result.body, {
            success: true
          });
        });
    });

    it('should be successful with ghost option', function() {
      return request(app)
        .delete('/v1/user/me')
        .send({
          ghost: true
        })
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200)
        .then(function(result) {
          assert.strictEqual(result.status, 200);
          assert.deepEqual(result.body, {
            success: true
          });
        });
    });

    it('should clear access tokens', async function() {
      // Delete the user
      await request(app)
        .delete('/v1/user/me')
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200);

      // Access token should no longer work
      await request(app)
        .get('/v1/user/me')
        .set('x-access-token', fixture.user1.accessToken)
        .expect(401);
    });
  });
});
