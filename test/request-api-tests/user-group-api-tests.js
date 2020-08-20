'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('user-group-api', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  fixtureLoader.ensureIntegrationEnvironment('#integrationUser1', 'GITTER_INTEGRATION_ORG');

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }]
    },
    user1: '#integrationUser1',
    group1: {},
    group2: {},
    troupe1: {
      security: 'PUBLIC',
      group: 'group1',
      users: ['user1']
    },
    troupe2: {
      security: 'PRIVATE',
      group: 'group1',
      users: ['user1']
    },
    troupe3: {
      /* Security is undefined */
      group: 'group2',
      users: ['user1']
    }
  });

  it('GET /v1/user/:userId/groups', function() {
    return request(app)
      .get('/v1/user/' + fixture.user1.id + '/groups')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var groups = result.body;

        assert(
          groups.some(function(r) {
            return r.id === fixture.group1.id;
          })
        );

        assert(
          groups.some(function(r) {
            return r.id === fixture.group2.id;
          })
        );

        assert.strictEqual(result.body.length, 2);
      });
  });

  it('PATCH /v1/user/:userId/groups/:groupId', function() {
    return request(app)
      .patch('/v1/user/' + fixture.user1.id + '/groups/' + fixture.group1.id)
      .send({
        favourite: 1
      })
      .set('x-access-token', fixture.user1.accessToken)
      .set('accept', 'application/json, text/javascript, */*')
      .expect(200)
      .then(function(result) {
        var group = result.body;
        assert.equal(group.favourite, 1);
      });
  });
});
