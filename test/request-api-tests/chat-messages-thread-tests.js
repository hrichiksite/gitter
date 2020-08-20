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
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    oAuthClient1: {},
    oAuthAccessTokenAnonymous: { client: 'oAuthClient1', user: null },
    user1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1']
    },
    user2: {
      accessToken: 'web-internal'
    },
    troupe2: {
      users: ['user1'],
      securityDescriptor: {
        members: 'INVITE',
        admins: 'MANUAL',
        public: false
      }
    },
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'A',
      sent: new Date('2014-01-01T00:00:00.000Z')
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      parent: 'message1',
      text: 'B',
      sent: new Date('2014-01-02T00:00:00.000Z')
    },
    message3: {
      user: 'user1',
      troupe: 'troupe1',
      parent: 'message1',
      text: 'C',
      sent: new Date('2014-01-03T00:00:00.000Z')
    },
    message4: {
      user: 'user1',
      troupe: 'troupe2',
      text: 'D',
      sent: new Date('2014-01-04T00:00:00.000Z')
    },
    message5: {
      user: 'user1',
      troupe: 'troupe2',
      parent: 'message4',
      text: 'E',
      sent: new Date('2014-01-04T00:00:00.000Z')
    }
  });

  it('GET /v1/rooms/:roomId/chatMessages/:parentId/thread', function() {
    return request(app)
      .get(`/v1/rooms/${fixture.troupe1.id}/chatMessages/${fixture.message1.id}/thread`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(response => response.body)
      .then(messages =>
        assert.deepEqual(messages.map(m => m.id), [fixture.message2.id, fixture.message3.id])
      );
  });

  it('GET /v1/rooms/:roomId/chatMessages/:parentId/thread?beforeId=xxx', () => {
    return request(app)
      .get(
        `/v1/rooms/${fixture.troupe1.id}/chatMessages/${fixture.message1.id}/thread?beforeId=${fixture.message3.id}`
      )
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(response => response.body)
      .then(messages => assert.deepEqual(messages.map(m => m.id), [fixture.message2.id]));
  });

  it('GET /v1/rooms/:roomId/chatMessages/:parentId/thread?limit=1', function() {
    return request(app)
      .get(`/v1/rooms/${fixture.troupe1.id}/chatMessages/${fixture.message1.id}/thread?limit=1`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(response => response.body)
      .then(messages => assert.deepEqual(messages.map(m => m.id), [fixture.message3.id]));
  });

  it('Forbidden GET /v1/rooms/:roomId/chatMessages/:parentId/thread', function() {
    return request(app)
      .get(`/v1/rooms/${fixture.troupe2.id}/chatMessages/${fixture.message4.id}/thread`)
      .set('x-access-token', fixture.user2.accessToken)
      .expect(403);
  });

  it('GET /v1/rooms/:roomId/chatMessages/:parentId/thread - anonymous', async () => {
    const response = await request(app)
      .get(`/v1/rooms/${fixture.troupe1.id}/chatMessages/${fixture.message1.id}/thread`)
      .set('x-access-token', fixture.oAuthAccessTokenAnonymous)
      .expect(200);
    const messages = response.body;
    assert.deepEqual(messages.map(m => m.id), [fixture.message2.id, fixture.message3.id]);
    assert.equal(
      messages.find(m => m.unread),
      undefined,
      'anonymous users should have all messages read'
    );
  });
});
