'use strict';

const assert = require('assert');
const testRequire = require('../../test-require');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const orgRenderer = testRequire('./handlers/renderers/org');

describe('org-renderer', function() {
  var fixture = fixtureLoader.setupEach({
    user1: {},
    user2: {},
    user3: {},
    userToDelete: {},
    troupe1: { users: ['user1', 'user2', 'user3'] },
    troupeWithDeletedUser: { users: ['user1', 'user2', 'user3', 'userToDelete'] }
  });

  beforeEach(() => {
    return fixture.userToDelete.remove();
  });

  describe('getRoomMembersForRooms', () => {
    it('returns room membership', async () => {
      const roomMembershipMap = await orgRenderer.testOnly.getRoomMembersForRooms([
        fixture.troupe1
      ]);
      assert.strictEqual(Object.keys(roomMembershipMap).length, 1);
      assert.strictEqual(roomMembershipMap[fixture.troupe1.id].length, 3);
    });

    it('works with room that has an undefined deleted user', async () => {
      const roomMembershipMap = await orgRenderer.testOnly.getRoomMembersForRooms([
        fixture.troupeWithDeletedUser
      ]);
      assert.strictEqual(Object.keys(roomMembershipMap).length, 1);

      const roomMembersInTroupeWithDeletedUser =
        roomMembershipMap[fixture.troupeWithDeletedUser.id];
      assert.strictEqual(roomMembersInTroupeWithDeletedUser.length, 3);
      // Make sure none of the returned users are undefined
      roomMembersInTroupeWithDeletedUser.forEach(user => {
        assert(user);
      });
    });
  });
});
