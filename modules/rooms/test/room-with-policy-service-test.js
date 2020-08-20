'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var RoomWithPolicyService = require('../lib/room-with-policy-service');

describe('room-with-policy-service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    userStaff: {
      staff: true
    },
    troupe1: {
      users: ['user1']
    },
    troupeWithReservedTags: {
      tags: ['foo:bar', 'foo']
    },
    troupeBan: {
      security: 'PUBLIC',
      githubType: 'REPO',
      users: ['userBan', 'userBanAdmin']
    },
    troupeBan2: {
      security: 'PUBLIC',
      githubType: 'REPO',
      users: ['userBan', 'userBanAdmin']
    },
    userBan: {},
    userBanAdmin: {},
    troupeForDeletion: {}
  });

  var isAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(true);
    },
    canJoin: function() {
      return Promise.resolve(true);
    }
  };

  var notAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(false);
    }
  };

  describe('updateTags #slow', function() {
    it('should update tags', function() {
      var rawTags = 'js, open source,    looooooooooooooooooooooooooooongtag,,,,';
      var cleanTags = ['js', 'open source', 'looooooooooooooooooo'];
      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      return r.updateTags(rawTags).then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
    });

    it('should not save reserved-word tags(colons) with normal-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'there'];

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      return r.updateTags(rawTags).then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
    });

    it('should deny a non-admin', function() {
      var rawTags = 'hey, foo:bar, there';

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, notAdminPolicy);
      return r
        .updateTags(rawTags)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
        });
    });

    it('should save reserved-word tags with staff-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'foo:bar', 'there'];

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.userStaff, notAdminPolicy);
      return r.updateTags(rawTags).then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
    });

    it('should retain reserved-word tags with normal-user', function() {
      var fixtureTags = 'foo:bar, foo';
      var userTags = 'hey, there';
      var userActualTags = ['hey', 'there', 'foo:bar'];

      var r1 = new RoomWithPolicyService(
        fixture.troupeWithReservedTags,
        fixture.userStaff,
        notAdminPolicy
      );
      var r2 = new RoomWithPolicyService(
        fixture.troupeWithReservedTags,
        fixture.user1,
        isAdminPolicy
      );

      return r1
        .updateTags(fixtureTags)
        .then(function() {
          return r2.updateTags(userTags);
        })
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), userActualTags);
        });
    });
  });

  describe('bans #slow', function() {
    it('should ban users from rooms #slow', function() {
      var roomService = require('../lib/room-service');
      var roomMembershipService = require('../lib/room-membership-service');

      var r = new RoomWithPolicyService(fixture.troupeBan, fixture.userBanAdmin, isAdminPolicy);

      return roomService
        .findBanByUsername(fixture.troupeBan._id, fixture.userBan.username)
        .then(function(banned) {
          assert(!banned);

          return r
            .banUserFromRoom(fixture.userBan.username, {})
            .then(function(ban) {
              assert.equal(ban.userId, fixture.userBan.id);
              assert.equal(ban.bannedBy, fixture.userBanAdmin.id);
              assert(ban.dateBanned);

              return roomMembershipService.checkRoomMembership(
                fixture.troupeBan._id,
                fixture.userBan.id
              );
            })
            .then(function(bannedUserIsInRoom) {
              assert(!bannedUserIsInRoom);

              return roomService.findBanByUsername(fixture.troupeBan.id, fixture.userBan.username);
            })
            .then(function(ban) {
              assert(ban);
              assert(ban.userId);

              return roomService
                .findBanByUsername(fixture.troupeBan._id, fixture.userBan.username)
                .then(function(banned) {
                  assert(banned);

                  return r.unbanUserFromRoom(ban.userId).then(function() {
                    return roomService
                      .findBanByUsername(fixture.troupeBan._id, fixture.userBan.username)
                      .then(function(banned) {
                        assert(!banned);

                        return roomService.findBanByUsername(
                          fixture.troupeBan.id,
                          fixture.userBan.username
                        );
                      })
                      .then(function(ban) {
                        assert(!ban);
                      });
                  });
                });
            });
        });
    });

    it('should not allow admins to be banned', function() {
      var RoomWithPolicyService = proxyquireNoCallThru('../lib/room-with-policy-service', {
        'gitter-web-permissions/lib/policy-factory': {
          createPolicyForRoom: function(user, room) {
            assert.strictEqual(user.id, fixture.userBan.id);
            assert.strictEqual(room.id, fixture.troupeBan2.id);
            return Promise.resolve({
              canAdmin: function() {
                return Promise.resolve(true);
              }
            });
          }
        }
      });

      var r = new RoomWithPolicyService(fixture.troupeBan2, fixture.userBanAdmin, isAdminPolicy);

      return r
        .banUserFromRoom(fixture.userBan.username, {})
        .then(function() {
          assert(false, 'Expected to fail as banned user is an admin');
        })
        .catch(StatusError, function(err) {
          assert.equal(err.status, 403);
        });
    });

    it('should not allow non-admins to ban', function() {
      var r = new RoomWithPolicyService(fixture.troupeBan2, fixture.userBanAdmin, notAdminPolicy);

      return r
        .banUserFromRoom(fixture.userBan.username, {})
        .then(function() {
          assert(false, 'Expected to fail');
        })
        .catch(StatusError, function(err) {
          assert.equal(err.status, 403);
        });
    });
  });

  describe('meta', function() {
    it('should allow you to set a welcome message', async function() {
      const welcomeMessageText = 'this is a test';
      const r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      await r.updateRoomMeta({ welcomeMessage: welcomeMessageText });

      const { welcomeMessage } = await r.getMeta();
      assert(welcomeMessage.text);
      assert(welcomeMessage.html);
      assert.equal(welcomeMessage.text, welcomeMessageText);
    });

    it('should retrieve room metadata', async () => {
      const r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      await r.updateRoomMeta({ welcomeMessage: 'hello' });
      const result = await r.getMeta();
      assert.deepStrictEqual(result, {
        welcomeMessage: { text: 'hello', html: 'hello' }
      });
    });
  });

  describe('delete room', function() {
    it('should allow an admin to delete a room', function() {
      var r = new RoomWithPolicyService(fixture.troupeForDeletion, fixture.user1, isAdminPolicy);
      return r.deleteRoom().then(function() {
        return persistence.Troupe.findById(fixture.troupeForDeletion._id).then(function(troupe) {
          assert(!troupe);
        });
      });
    });

    it('should not allow a non-admin to delete a room', function() {
      var r = new RoomWithPolicyService(fixture.troupeForDeletion, fixture.user1, notAdminPolicy);
      return r.deleteRoom().catch(StatusError, function(err) {
        assert.equal(err.status, 403);
      });
    });
  });
});
