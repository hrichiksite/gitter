'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const fingerprintingService = require('gitter-web-fingerprinting/lib/fingerprinting-service');

describe('user-fingerprints-export-api', function() {
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

  it('GET /api_web/export/user/:user_id/fingerprints.ndjson as same user gets data', async () => {
    await fingerprintingService.recordFingerprint(fixture.user1.id, 'abc123', '0.0.0.0');
    await fingerprintingService.recordFingerprint(fixture.user1.id, 'qwe456', '0.0.0.0');
    await fingerprintingService.recordFingerprint(
      fixture.userNoExport1.id,
      'no-export999',
      '0.0.0.0'
    );

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/fingerprints.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          2,
          'includes 1 object with `fingerprints` map (extra newline at the end)'
        );
        assert(result.text.includes('abc123'), 'includes fingerprint1');
        assert(result.text.includes('qwe456'), 'includes fingerprint2');
        assert(!result.text.includes('no-export999'), 'does not include fingerprintNoExport1');
      });
  });
});
