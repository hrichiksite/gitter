'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('check-group-uri #slow', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  fixtureLoader.ensureIntegrationEnvironment('#integrationUser1');

  var fixture = fixtureLoader.setup({
    user1: '#integrationUser1'
  });

  it('GET /private/check-group-uri', function() {
    return request(app)
      .get('/private/check-group-uri')
      .query({ uri: '_hopefully-this-does-not-exist' })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);
  });
});
