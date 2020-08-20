'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('user-oauth-access-tokens-export-api', function() {
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
    },
    oAuthClient1: {},
    oAuthAccessToken1: { user: 'user1', client: 'oAuthClient1' },
    oAuthClient2: {},
    oAuthAccessToken2: { user: 'user1', client: 'oAuthClient2' },
    oAuthClientNoExport1: {},
    oAuthAccessTokenNoExport1: { user: 'userNoExport1', client: 'oAuthClientNoExport1' }
  });

  it('GET /api_web/export/user/:user_id/oauth-access-tokens.ndjson as same user gets data', async () => {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/oauth-access-tokens.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        console.log('result.text', result.text);
        assert.strictEqual(
          result.text.split('\n').length,
          4,
          // 2 + 1 because we defined 2 access tokens explicitely in the fixtures and the other one from the `accessToken: 'web-internal'`
          'includes 2 + 1 OAuth access tokens (extra newline at the end)'
        );
        assert(result.text.includes(fixture.oAuthAccessToken1.id), 'includes oAuthAccessToken1');
        assert(result.text.includes(fixture.oAuthAccessToken2.id), 'includes oAuthAccessToken2');
        assert(
          !result.text.includes(fixture.oAuthAccessTokenNoExport1.id),
          'does not include oAuthAccessTokenNoExport1'
        );
      });
  });
});
