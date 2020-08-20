'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('room-security-api', function() {
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
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['user1']
      },
      users: ['user1']
    },
    group1: {},
    troupe2: {
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['user1']
      },
      users: ['user1'],
      group: 'group1'
    },
    troupe3: {
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['user1']
      },
      users: ['user1'],
      group: 'group1'
    }
  });

  it('GET /v1/rooms/:roomId/security', function() {
    var roomId = fixture.troupe1.id;
    return request(app)
      .get('/v1/rooms/' + roomId + '/security')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(res) {
        assert.deepEqual(res.body, {
          type: null,
          admins: 'MANUAL',
          members: 'PUBLIC'
        });
      });
  });

  it('PUT /v1/rooms/:roomId/security - no changes to extraAdmins', function() {
    var roomId = fixture.troupe2.id;
    return request(app)
      .put('/v1/rooms/' + roomId + '/security')
      .send({
        type: 'GROUP'
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(res) {
        assert.deepEqual(res.body, { type: 'GROUP', admins: 'GROUP_ADMIN', members: 'PUBLIC' });
      });
  });

  it('PUT /v1/rooms/:roomId/security - updated extraAdmins', function() {
    var roomId = fixture.troupe3.id;
    return request(app)
      .put('/v1/rooms/' + roomId + '/security')
      .send({
        type: null,
        extraAdmins: [fixture.user1.id, fixture.user2.id]
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(res) {
        assert.deepEqual(res.body, {
          type: null,
          admins: 'MANUAL',
          members: 'PUBLIC'
        });
      });
  });

  it('PUT /v1/rooms/:roomId/security - no extraAdmins', function() {
    var roomId = fixture.troupe3.id;
    return request(app)
      .put('/v1/rooms/' + roomId + '/security')
      .send({
        extraAdmins: []
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(400);
  });

  it('GET /v1/rooms/:roomId/security/extraAdmins', function() {
    var roomId = fixture.troupe1.id;
    return request(app)
      .get('/v1/rooms/' + roomId + '/security/extraAdmins')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(res) {
        var users = res.body;
        assert(Array.isArray(users));
        assert.strictEqual(users.length, 1);
        assert.strictEqual(users[0].id, fixture.user1.id);
      });
  });

  it('POST /v1/rooms/:roomId/security/extraAdmins', function() {
    var roomId = fixture.troupe1.id;
    return request(app)
      .post('/v1/rooms/' + roomId + '/security/extraAdmins')
      .send({
        id: fixture.user2.id
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(res) {
        var user = res.body;

        assert.strictEqual(user.id, fixture.user2.id);
      });
  });

  it('DELETE /v1/rooms/:roomId/security/extraAdmins/:userId', function() {
    var roomId = fixture.troupe1.id;
    var userId = fixture.user2.id;
    return request(app)
      .del('/v1/rooms/' + roomId + '/security/extraAdmins/' + userId)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(204)
      .then(function() {});
  });
});
