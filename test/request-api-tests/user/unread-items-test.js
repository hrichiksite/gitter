'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

const delay = time => new Promise(resolve => setTimeout(resolve, time));

describe('chat-api', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../../server/api');
  });

  var fixture = fixtureLoader.setup({
    oAuthClient1: {},
    oAuthAccessTokenAnonymous: { client: 'oAuthClient1', user: null },
    user1: {
      accessToken: 'web-internal'
    },
    user2: {
      accessToken: 'web-internal'
    },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1', 'user2']
    }
  });

  it('POST/DELETE/unread-items non mentions', function() {
    var chatId;

    return request(app)
      .post('/v1/rooms/' + fixture.troupe1.id + '/chatMessages')
      .send({
        text: 'Hello there'
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        chatId = body.id;
      })
      .then(delay(1000))
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe1.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;
        assert.deepEqual(unreadItems, {
          chat: [chatId],
          mention: []
        });

        return request(app)
          .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + chatId)
          .set('x-access-token', fixture.user1.accessToken)
          .expect(204);
      })
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe1.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;

        assert.deepEqual(unreadItems, {
          chat: [],
          mention: []
        });
      });
  });

  it('POST/DELETE/unread-items mentions', function() {
    var chatId;

    return request(app)
      .post('/v1/rooms/' + fixture.troupe1.id + '/chatMessages')
      .send({
        text: 'Hello there @' + fixture.user2.username
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        chatId = body.id;
      })
      .then(delay(1000))
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe1.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;
        assert.deepEqual(unreadItems, {
          chat: [chatId],
          mention: [chatId]
        });

        return request(app)
          .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + chatId)
          .set('x-access-token', fixture.user1.accessToken)
          .expect(204);
      })
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe1.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;

        assert.deepEqual(unreadItems, {
          chat: [],
          mention: []
        });
      });
  });
});
