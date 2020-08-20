'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const pushNotificationService = require('gitter-web-push-notifications');

describe('user-push-notification-devices-export-api', function() {
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

  it('GET /api_web/export/user/:user_id/push-notification-devices.ndjson as same user gets data', async () => {
    const device1 = await pushNotificationService.registerUser('1234', fixture.user1.id);
    const device2 = await pushNotificationService.registerUser('4567', fixture.user1.id);
    const noExportDevice1 = await pushNotificationService.registerUser(
      '999',
      fixture.userNoExport1.id
    );

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/push-notification-devices.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 push notification devices (extra newline at the end)'
        );
        assert(result.text.includes(device1._id), 'includes device1');
        assert(result.text.includes(device2._id), 'includes device2');
        assert(!result.text.includes(noExportDevice1._id), 'does not include noExportDevice1');
      });
  });
});
