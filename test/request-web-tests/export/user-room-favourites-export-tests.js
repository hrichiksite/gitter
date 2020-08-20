'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const roomFavouritesCore = require('gitter-web-rooms/lib/room-favourites-core');

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

  it('GET /api_web/export/user/:user_id/room-favourites.ndjson as same user gets data', async () => {
    await roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe1.id, 1);
    await roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe2.id, 2);
    await roomFavouritesCore.updateFavourite(
      fixture.userNoExport1.id,
      fixture.troupeNoExport1.id,
      0
    );

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/room-favourites.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          2,
          'includes 1 object with `favs` map (extra newline at the end)'
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
