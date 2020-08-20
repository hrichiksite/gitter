'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const recentRoomCore = require('gitter-web-rooms/lib/recent-room-core');

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
    troupe1: {},
    troupe2: {},
    troupeNoExport1: {}
  });

  it('GET /api_web/export/user/:user_id/room-last-access-times.ndjson as same user gets data', async () => {
    await recentRoomCore.saveUserTroupeLastAccess(fixture.user1.id, fixture.troupe1.id, new Date());
    await recentRoomCore.saveUserTroupeLastAccess(fixture.user1.id, fixture.troupe2.id, new Date());
    await recentRoomCore.saveUserTroupeLastAccess(
      fixture.userNoExport1.id,
      fixture.troupeNoExport1.id,
      new Date()
    );

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/room-last-access-times.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 rooms (extra newline at the end)'
        );
        assert(result.text.includes(fixture.troupe1.id), 'includes troupe1');
        assert(result.text.includes(fixture.troupe2.id), 'includes troupe2');
        assert(
          !result.text.includes(fixture.troupeNoExport1.id),
          'does not include troupeNoExport1'
        );
      });
  });
});
