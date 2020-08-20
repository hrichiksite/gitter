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
    messageBad2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO1',
      sent: new Date(),
      pub: 1
    },
    messageBad3: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO1',
      sent: new Date(),
      pub: 1
    }
  });

  it('POST /v1/rooms/:roomId/chatMessages/:chatMessageId/report - own message', function() {
    return request(app)
      .post(
        '/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.messageBad3.id + '/report'
      )
      .set('x-access-token', fixture.user1.accessToken)
      .expect(403);
  });

  it('POST /v1/rooms/:roomId/chatMessages/:chatMessageId/report - some elses message', function() {
    return request(app)
      .post(
        '/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.messageBad2.id + '/report'
      )
      .set('x-access-token', fixture.user2.accessToken)
      .expect(200)
      .then(function(result) {
        const body = result.body;
        assert.strictEqual(body.messageId, fixture.messageBad2.id);
        assert.strictEqual(body.messageText, fixture.messageBad2.text);
      });
  });

  it('POST /v1/rooms/:roomId/chatMessages/:chatMessageId/report - as admin', function() {
    return request(app)
      .post(
        '/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.messageBad2.id + '/report'
      )
      .set('x-access-token', fixture.user3.accessToken)
      .expect(200)
      .then(function(result) {
        const body = result.body;
        assert.strictEqual(body.messageId, fixture.messageBad2.id);
        assert.strictEqual(body.messageText, fixture.messageBad2.text);
      });
  });
});
