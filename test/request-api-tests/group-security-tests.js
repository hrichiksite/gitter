'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('group-security-api', function() {
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
    group1: {
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['user1']
      },
      users: ['user1']
    },
    group2: {
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['user1']
      }
    },
    group3: {
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['user1']
      }
    }
  });

  it('GET /v1/groups/:groupId/security', function() {
    var groupId = fixture.group1.id;
    return request(app)
      .get('/v1/groups/' + groupId + '/security')
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

  it('PUT /v1/groups/:groupId/security - no changes to extraAdmins', function() {
    var groupId = fixture.group2.id;
    return request(app)
      .put('/v1/groups/' + groupId + '/security')
      .send({
        type: null
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

  it('PUT /v1/groups/:groupId/security - updated extraAdmins', function() {
    var groupId = fixture.group3.id;
    return request(app)
      .put('/v1/groups/' + groupId + '/security')
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

  it('GET /v1/groups/:groupId/security/extraAdmins', function() {
    var groupId = fixture.group1.id;
    return request(app)
      .get('/v1/groups/' + groupId + '/security/extraAdmins')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(res) {
        var users = res.body;
        assert(Array.isArray(users));
        assert.strictEqual(users.length, 1);
        assert.strictEqual(users[0].id, fixture.user1.id);
      });
  });

  it('POST /v1/groups/:groupId/security/extraAdmins', function() {
    var groupId = fixture.group1.id;
    return request(app)
      .post('/v1/groups/' + groupId + '/security/extraAdmins')
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

  it('DELETE /v1/groups/:groupId/security/extraAdmins/:userId', function() {
    var groupId = fixture.group1.id;
    var userId = fixture.user2.id;
    return request(app)
      .del('/v1/groups/' + groupId + '/security/extraAdmins/' + userId)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(204)
      .then(function() {});
  });
});
