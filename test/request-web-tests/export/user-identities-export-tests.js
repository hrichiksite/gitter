'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('user-identities-export-api', function() {
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
    identityGitlab1: {
      user: 'user1',
      provider: 'gitlab',
      providerKey: fixtureLoader.generateGithubId()
    },
    identityNoExport1: {
      user: 'userNoExport1',
      provider: 'gitlab',
      providerKey: fixtureLoader.generateGithubId()
    }
  });

  it('GET /api_web/export/user/:user_id/identities.ndjson as same user gets data', function() {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/identities.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          2,
          'includes 1 identity (extra newline at the end)'
        );
        assert(result.text.includes(fixture.identityGitlab1.id), 'includes identityGitlab1');
        assert(
          !result.text.includes(fixture.identityNoExport1.id),
          'does not include identityNoExport1'
        );
      });
  });
});
