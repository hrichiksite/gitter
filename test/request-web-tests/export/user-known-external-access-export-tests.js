'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const knownAccessRecorder = require('gitter-web-permissions/lib/known-external-access/recorder');

let incrementIndex = 0;
async function createKnownAcessForUser(user, linkPath) {
  incrementIndex += incrementIndex;

  return await knownAccessRecorder(
    user.id,
    'GL_USER',
    'GL_USER_SAME',
    linkPath,
    `${Math.ceil(Math.random() * 1000)}${incrementIndex}`,
    true
  );
}

describe('user-known-external-access-export-api', function() {
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

  it('GET /api_web/export/user/:user_id/known-external-access.ndjson as same user gets data', async () => {
    await createKnownAcessForUser(fixture.user1, fixture.user1.username);
    await createKnownAcessForUser(fixture.user1, 'some-other-group');
    await createKnownAcessForUser(fixture.userNoExport1, fixture.userNoExport1.username);

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/known-external-access.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 known external access for user (extra newline at the end)'
        );
        assert(result.text.includes(fixture.user1.id), 'includes user1');
        assert(result.text.includes('some-other-group'), 'includes other group');
        assert(!result.text.includes(fixture.userNoExport1.id), 'does not include userNoExport1');
      });
  });
});
