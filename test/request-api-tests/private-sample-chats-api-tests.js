'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('room-api', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    user2: {
      accessToken: 'web-internal'
    },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1']
    },
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO',
      sent: new Date(),
      pub: 1
    }
  });

  fixtureLoader.disableMongoTableScans();

  it('GET /private/sample-chats', function() {
    return request(app)
      .get('/private/sample-chats')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var sampleChats = result.body;
        assert(sampleChats.length >= 1);
        var sampleChat = sampleChats[0];
        assert(sampleChat.avatarUrl);
        assert(sampleChat.username);
        assert(sampleChat.displayName);
        assert(sampleChat.room);
      });
  });
});
