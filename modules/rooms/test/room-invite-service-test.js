'use strict';

const assert = require('assert');
const env = require('gitter-web-env');
const config = env.config;
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const roomInviteService = require('../lib/room-invite-service');

const ROOM_INVITE_RATE_LIMIT_THRESHOLD = config.get('email:inviteEmailAbuseThresholdPerDay');

describe('room-context-service', () => {
  var fixture = fixtureLoader.setup({
    user1: {},
    userInviting1: {},
    troupe1: {}
  });

  it('should invite existing user', async () => {
    const result = await roomInviteService.createInvite(fixture.troupe1, fixture.userInviting1, {
      type: 'gitter',
      externalId: fixture.user1.username,
      emailAddress: undefined
    });

    assert.strictEqual(result.status, 'added');
    assert.strictEqual(result.user.username, fixture.user1.username);
  });

  it('should invite someone by email', async () => {
    const email = 'foo@gitter.im';
    const result = await roomInviteService.createInvite(fixture.troupe1, fixture.userInviting1, {
      type: 'email',
      externalId: email,
      emailAddress: email
    });

    assert.strictEqual(result.status, 'invited');
    assert.strictEqual(result.emailAddress, email);
  });

  it('should be rate-limited when inviting many people by email', async () => {
    try {
      for (var i = 0; i < ROOM_INVITE_RATE_LIMIT_THRESHOLD + 1; i++) {
        const email = `foo${i}@gitter.im`;
        await roomInviteService.createInvite(fixture.troupe1, fixture.userInviting1, {
          type: 'email',
          externalId: email,
          emailAddress: email
        });
      }
    } catch (err) {
      assert(err);
      assert(err.status, 501);
    }
  });
});
