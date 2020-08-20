'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const uriLookupService = require('gitter-web-uri-resolver/lib/uri-lookup-service');

describe('user-uri-lookups-export-api', function() {
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
    troupe1: {},
    troupe2: {},
    troupeNoExport1: {}
  });

  it('GET /api_web/export/user/:user_id/uri-lookups.ndjson as same user gets data', async () => {
    await uriLookupService.reserveUriForUsername(fixture.user1.id, fixture.user1.username);
    await uriLookupService.reserveUriForUsername(
      fixture.userNoExport1.id,
      fixture.userNoExport1.username
    );

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/uri-lookups.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          2,
          'includes 1 URI lookup for user (extra newline at the end)'
        );
        assert(result.text.includes(fixture.user1.id), 'includes user1');
        assert(!result.text.includes(fixture.userNoExport1.id), 'does not include userNoExport1');
      });
  });
});
