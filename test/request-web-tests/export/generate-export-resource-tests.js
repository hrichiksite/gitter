'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('user-messages-export-api', function() {
  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;
  });

  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    userNoExport1: {
      accessToken: 'web-internal'
    }
  });

  it('GET /api_web/export/user/:user_id/messages.ndjson unauthorized returns nothing', function() {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/messages.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .expect(401)
      .then(function(result) {
        assert.deepEqual(result.body, { success: false, loginRequired: true });
      });
  });

  it('GET /api_web/export/user/:user_id/messages.ndjson forbidden returns nothing', function() {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/messages.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.userNoExport1.accessToken}`)
      .expect(403)
      .then(function(result) {
        assert.deepEqual(result.body, { error: 'Forbidden' });
      });
  });

  it('GET /api_web/export/user/:user_id/messages.ndjson as <img> does not work', function() {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/messages.ndjson`)
      .set('Accept', 'image/*')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(406)
      .then(function(result) {
        assert.deepEqual(result.body, {});
      });
  });

  it('GET /api_web/export/user/:user_id/messages.ndjson with no messages still works', function() {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/messages.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(result.text.split('\n').length, 1, 'just an extra newline at the end');
        assert(
          !result.text.includes(fixture.user1.id),
          'does not include a message or even the user'
        );
      });
  });

  it('GET /api_web/export/user/:user_id/messages.ndjson when hits rate limit returns error', function() {
    process.env.TEST_EXPORT_RATE_LIMIT = 0;

    delete require.cache[require.resolve('../../../server/web')];
    delete require.cache[require.resolve('../../../server/api-web')];
    delete require.cache[require.resolve('../../../server/api-web/export')];
    delete require.cache[require.resolve('../../../server/api-web/export/user-export-resource')];
    delete require.cache[
      require.resolve('../../../server/api-web/export/generate-export-resource')
    ];

    const zeroLimitApp = require('../../../server/web');

    return request(zeroLimitApp)
      .get(`/api_web/export/user/${fixture.user1.id}/messages.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(429);
  });
});
