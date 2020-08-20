'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('user-room-favourites-export-api', function() {
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
    oAuthClient1: {
      ownerUser: 'user1'
    },
    oAuthClient2: {
      ownerUser: 'user1'
    },
    oAuthClientNoExport1: {
      ownerUser: 'userNoExport1'
    }
  });

  it('GET /api_web/export/user/:user_id/oauth-clients.ndjson as same user gets data', async () => {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/oauth-clients.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 OAuth clients (extra newline at the end)'
        );
        assert(result.text.includes(fixture.oAuthClient1.id), 'includes oAuthClient1');
        assert(result.text.includes(fixture.oAuthClient2.id), 'includes oAuthClient2');
        assert(
          !result.text.includes(fixture.oAuthClientNoExport1.id),
          'does not include oAuthClientNoExport1'
        );
      });
  });
});
