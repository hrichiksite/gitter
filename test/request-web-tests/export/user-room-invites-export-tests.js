'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const invitesService = require('gitter-web-invites');

async function createAcceptedInvite(room, user, invitingUser) {
  const invite = await invitesService.createInvite(room.id, {
    type: 'github',
    externalId: 'gitterawesome',
    invitedByUserId: invitingUser.id,
    emailAddress: 'test@gitter.im'
  });

  await invitesService.markInviteAccepted(invite.id, user.id);

  return invite;
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
    user2: {
      accessToken: 'web-internal'
    },
    troupe1: {},
    troupe2: {},
    troupeNoExport1: {}
  });

  it('GET /api_web/export/user/:user_id/room-invites.ndjson as same user gets data', async () => {
    const invite1 = await createAcceptedInvite(fixture.troupe1, fixture.user1, fixture.user2);
    const invite2 = await createAcceptedInvite(fixture.troupe2, fixture.user1, fixture.user2);
    // This should not be included in invites (should be in sent invites, test below)
    const sentInvite1 = await createAcceptedInvite(fixture.troupe2, fixture.user2, fixture.user1);

    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/room-invites.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 invites (extra newline at the end)'
        );
        assert(result.text.includes(invite1._id), 'includes invite1');
        assert(result.text.includes(invite2._id), 'includes invite2');
        assert(!result.text.includes(sentInvite1._id), 'does not include sentInvite1');
      });
  });
});
