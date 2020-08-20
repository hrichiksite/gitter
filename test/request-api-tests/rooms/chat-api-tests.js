'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

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
    user3: {
      accessToken: 'web-internal'
    },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1'],
      securityDescriptor: {
        extraAdmins: ['user3']
      }
    },
    troupe2: {
      security: 'PUBLIC',
      users: ['user2']
    },
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO1',
      sent: new Date(),
      pub: 1
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO2',
      sent: new Date(),
      pub: 1
    },
    message3: {
      user: 'user3',
      troupe: 'troupe1',
      text: 'HELLO2',
      sent: new Date(),
      pub: 1
    },
    message4: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'hello from the child',
      parent: 'message1',
      pub: 1
    }
  });

  describe('get messages', () => {
    it('GET /v1/rooms/:roomId/chatMessages - anonymous token access', async () => {
      const response = await request(app)
        .get('/v1/rooms/' + fixture.troupe1.id + '/chatMessages')
        .set('x-access-token', fixture.oAuthAccessTokenAnonymous)
        .expect(200);
      const messages = response.body;
      assert(Array.isArray(messages), 'response body needs to be an array of messages');
      assert(messages.length > 0, 'API should return some messages for anonymous token');
      assert.equal(
        messages.find(m => m.unread),
        undefined,
        'anonymous users should have all messages read'
      );
    });
    it('GET /v1/rooms/:roomId/chatMessages - do not include chat messages', async () => {
      assert(fixture.message4.parentId); // child message has to exist for the test
      const response = await request(app)
        .get('/v1/rooms/' + fixture.troupe1.id + '/chatMessages?includeThreads=false')
        .set('x-access-token', fixture.oAuthAccessTokenAnonymous)
        .expect(200);
      const messages = response.body;
      assert(Array.isArray(messages), 'response body needs to be an array of messages');
      assert(messages.length > 0, 'API should return some messages for anonymous token');
      assert.equal(
        messages.find(m => m.parentId),
        undefined,
        'no child messages should be returned'
      );
    });
    it('GET /v1/rooms/:roomId/chatMessages - include chat messages', async () => {
      assert(fixture.message4.parentId); // child message has to exist for the test
      const response = await request(app)
        .get('/v1/rooms/' + fixture.troupe1.id + '/chatMessages?includeThreads=true')
        .set('x-access-token', fixture.oAuthAccessTokenAnonymous)
        .expect(200);
      const messages = response.body;
      assert(Array.isArray(messages), 'response body needs to be an array of messages');
      assert(messages.length > 0, 'API should return some messages for anonymous token');
      assert.notEqual(
        messages.find(m => m.id === fixture.message4.id),
        undefined,
        'child messages should be included'
      );
    });
  });

  describe('create message', () => {
    it('POST /v1/rooms/:roomId/chatMessages', function() {
      return request(app)
        .post('/v1/rooms/' + fixture.troupe1.id + '/chatMessages')
        .send({
          text: 'Hello there'
        })
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200)
        .then(function(result) {
          var body = result.body;
          assert.strictEqual(body.text, 'Hello there');
        });
    });
    it('POST /v1/rooms/:roomId/chatMessages should get denied for anonymous token', async () => {
      await request(app)
        .post('/v1/rooms/' + fixture.troupe1.id + '/chatMessages')
        .send({
          text: 'Hello there'
        })
        .set('x-access-token', fixture.oAuthAccessTokenAnonymous)
        .expect(401);
    });
  });

  describe('update message', () => {
    it('PUT /v1/rooms/:roomId/chatMessages/:chatMessageId updates message', function() {
      const UPDATED_TEXT = 'updated message';
      return request(app)
        .put(`/v1/rooms/${fixture.troupe1.id}/chatMessages/${fixture.message1.id}`)
        .send({
          text: UPDATED_TEXT
        })
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200)
        .then(function(result) {
          var body = result.body;
          assert.strictEqual(body.text, UPDATED_TEXT);
        });
    });

    it('PUT /v1/rooms/:roomId/chatMessages/:chatMessageId fails when not author', function() {
      return request(app)
        .put(`/v1/rooms/${fixture.troupe1.id}/chatMessages/${fixture.message3.id}`)
        .send({
          text: 'x'
        })
        .set('x-access-token', fixture.user1.accessToken)
        .expect(403);
    });

    it('PUT /v1/rooms/:roomId/chatMessages/:chatMessageId fails when message not in given room', function() {
      // message 3 belongs to user 3 but the room in the request path is incorrect
      return request(app)
        .put(`/v1/rooms/${fixture.troupe2.id}/chatMessages/${fixture.message3.id}`)
        .send({
          text: 'x'
        })
        .set('x-access-token', fixture.user3.accessToken)
        .expect(404);
    });
  });

  describe('delete message', () => {
    it('DELETE /v1/rooms/:roomId/chatMessages/:chatMessageId - own message', function() {
      return request(app)
        .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.message1.id)
        .set('x-access-token', fixture.user1.accessToken)
        .expect(204);
    });

    it('DELETE /v1/rooms/:roomId/chatMessages/:chatMessageId - some elses message', function() {
      return request(app)
        .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.message2.id)
        .set('x-access-token', fixture.user2.accessToken)
        .expect(403);
    });

    it('DELETE /v1/rooms/:roomId/chatMessages/:chatMessageId - as admin', function() {
      return request(app)
        .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.message2.id)
        .set('x-access-token', fixture.user3.accessToken)
        .expect(204);
    });
  });
});
