'use strict';

process.env.DISABLE_API_LISTEN = '1';

const env = require('gitter-web-env');
const config = env.config;

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var _ = require('lodash');

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
    user3: {
      accessToken: 'web-internal'
    },
    user4: {},
    group1: {},
    troupe1: {
      security: 'PUBLIC',
      users: ['user1', 'user4'],
      securityDescriptor: {
        extraAdmins: ['user3']
      },
      group: 'group1'
    }
  });

  it('GET /v1/rooms', function() {
    return request(app)
      .get('/v1/rooms')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var rooms = result.body;
        assert.strictEqual(rooms.length, 1);

        var t1 = rooms.filter(function(r) {
          return r.id === fixture.troupe1.id;
        })[0];

        assert(t1);
      });
  });

  it('GET /v1/rooms/:roomId', function() {
    return request(app)
      .get('/v1/rooms/' + fixture.troupe1.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var room = result.body;

        assert.deepEqual(_.pick(room, 'id', 'uri'), {
          id: fixture.troupe1.id,
          uri: fixture.troupe1.uri
        });

        assert.deepEqual(_.pick(room.group, 'id', 'uri'), {
          id: fixture.group1.id,
          uri: fixture.group1.uri
        });
      });
  });

  it('GET /v1/rooms/:roomId/issues', function() {
    return request(app)
      .get('/v1/rooms/' + fixture.troupe1.id + '/issues')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var issues = result.body;

        assert.deepEqual(issues, []);
      });
  });

  it('POST /v1/rooms/ with a room', function() {
    return request(app)
      .post('/v1/rooms')
      .send({
        uri: fixture.troupe1.uri
      })
      .set('x-access-token', fixture.user2.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert.strictEqual(body.uri, fixture.troupe1.uri);
      });
  });

  it('POST /v1/rooms/ with a user', function() {
    return request(app)
      .post('/v1/rooms')
      .send({
        uri: fixture.user1.username
      })
      .set('x-access-token', fixture.user2.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert.strictEqual(body.user.username, fixture.user1.username);
      });
  });

  it('GET /v1/rooms/:roomId/suggestedRooms', function() {
    return request(app)
      .get('/v1/rooms/' + fixture.troupe1.id + '/suggestedRooms')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        // For now, this is a very loose test, to prove
        // https://github.com/troupe/gitter-webapp/pull/2067
        // We can extend it later
        var suggestions = result.body;
        assert(Array.isArray(suggestions));
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

  it('PUT /v1/rooms/:roomId with {providers: []}', function() {
    var room = fixture.troupe1;

    return request(app)
      .put('/v1/rooms/' + room.id)
      .send({
        providers: []
      })
      .set('x-access-token', fixture.user3.accessToken)
      .expect(200);
  });

  describe('meta', () => {
    it('GET /v1/rooms/:roomId/meta', function() {
      const room = fixture.troupe1;

      return request(app)
        .get(`/v1/rooms/${room.id}/meta`)
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200)
        .then(function(result) {
          assert.deepEqual(result.body, {
            welcomeMessage: { text: '', html: '' }
          });
        });
    });

    it('POST /v1/rooms/:roomId/meta', function() {
      const room = fixture.troupe1;

      return request(app)
        .post(`/v1/rooms/${room.id}/meta`)
        .send({
          welcomeMessage: 'asdf'
        })
        .set('x-access-token', fixture.user3.accessToken)
        .expect(200);
    });
  });

  it("POST /v1/rooms/:roomId/invites with a user doesn't leak email", function() {
    // See https://gitlab.com/gitlab-org/gitter/webapp/issues/2153
    // This test is under a conditional instead of skipped
    // so we don't accidentaly forget to unskip it in the future
    if (!config.get('email:limitInviteEmails')) {
      return request(app)
        .post(`/v1/rooms/${fixture.troupe1.id}/invites`)
        .send({
          // A user that has an email listed on their profile, https://github.com/gitter-badger
          githubUsername: 'gitter-badger'
        })
        .set('x-access-token', fixture.user2.accessToken)
        .expect(200)
        .then(function(result) {
          const body = result.body;
          assert.strictEqual(body.status, 'invited');
          assert.strictEqual(body.email, undefined);
        });
    }
  });

  it('GET /v1/rooms/:roomId/users?q=name', async () => {
    const result = await request(app)
      .get(`/v1/rooms/${fixture.troupe1.id}/users?q=name`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);
    const users = result.body;
    // ES is not populated in tests, just making sure that the code can execute
    assert.deepEqual(users, []);
  });

  it('GET /v1/rooms/:roomId/users?lean=true&skip=1&limit1', async () => {
    const result = await request(app)
      .get(`/v1/rooms/${fixture.troupe1.id}/users?lean=true&skip=1&limit1`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);
    const users = result.body;
    assert.equal(users.length, 1);
    // skips user1 and only returns user4
    assert.equal(users[0].id, fixture.user4._id.toString());
  });
});
