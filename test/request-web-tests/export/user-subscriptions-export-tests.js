'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const persistence = require('gitter-web-persistence');

async function createSubscription(user) {
  return await persistence.Subscription.create({
    userId: user.id,
    uri: user.username,
    lcUri: user.username.toLowerCase(),
    plan: 'pro',
    subscriptionType: 'USER',
    status: 'ARCHIVED'
  });
}

describe('user-room-invites-export-api', function() {
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

  it('GET /api_web/export/user/:user_id/subscriptions.ndjson as same user gets data', async () => {
    await createSubscription(fixture.user1);
    await createSubscription(fixture.userNoExport1);

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/subscriptions.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          2,
          'includes 1 subscription (extra newline at the end)'
        );
        assert(result.text.includes(fixture.user1.id), 'includes user1');
        assert(!result.text.includes(fixture.userNoExport1.id), 'does not include userNoExport1');
      });
  });
});
