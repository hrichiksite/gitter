'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const groupFavouritesCore = require('gitter-web-groups/lib/group-favourites-core');

describe('user-group-favourites-export-api', function() {
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
    group1: {},
    group2: {},
    groupNoExport1: {}
  });

  it('GET /api_web/export/user/:user_id/group-favourites.ndjson as same user gets data', async () => {
    await groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group1.id, 1);
    await groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group2.id, 2);
    await groupFavouritesCore.updateFavourite(
      fixture.userNoExport1.id,
      fixture.groupNoExport1.id,
      0
    );

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/group-favourites.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          2,
          'includes 1 object with `favs` map (extra newline at the end)'
        );
        assert(result.text.includes(fixture.group1.id), 'includes group1');
        assert(result.text.includes(fixture.group2.id), 'includes group2');
        assert(!result.text.includes(fixture.groupNoExport1.id), 'does not include groupNoExport1');
      });
  });
});
