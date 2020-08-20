'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var Promise = require('bluebird');
var sinon = require('sinon');
var roomMembershipFlags = require('../lib/room-membership-flags');
var roomMembershipService = require('../lib/room-membership-service');
var persistence = require('gitter-web-persistence');

function mongoIdEqualPredicate(value) {
  var strValue = String(value);
  return function(x) {
    return String(x) === strValue;
  };
}

describe('room-membership-service', function() {
  describe('integration tests #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      troupe1: {},
      troupe2: {},
      troupe3: {}
    });

    describe('addRoomMember', function() {
      beforeEach(function() {
        return roomMembershipService.removeRoomMembers(fixture.troupe3._id, [
          fixture.user1.id,
          fixture.user2.id,
          fixture.user3.id
        ]);
      });

      it('should add a single user to a room', function() {
        var troupeId3 = fixture.troupe3._id;
        var userId1 = fixture.user1._id;
        var flags = roomMembershipFlags.MODES.all;

        return roomMembershipService
          .addRoomMember(troupeId3, userId1, flags)
          .then(function() {
            return roomMembershipService.countMembersInRoom(troupeId3);
          })
          .then(function(count) {
            assert.strictEqual(count, 1);
            return roomMembershipService.findMembersForRoom(troupeId3);
          })
          .then(function(members) {
            assert.deepEqual(members, [userId1]);

            return roomMembershipService.findRoomIdsForUser(userId1);
          })
          .then(function(roomIds) {
            assert(roomIds.length >= 1);
            assert(roomIds.some(mongoIdEqualPredicate(troupeId3)));

            return persistence.TroupeUser.findOne({ troupeId: troupeId3, userId: userId1 }).exec();
          })
          .then(function(troupeUser) {
            assert.strictEqual(troupeUser.flags, flags);
          });
      });

      it('should handle different flags', function() {
        var troupeId3 = fixture.troupe3._id;
        var userId1 = fixture.user1._id;
        var userId2 = fixture.user2._id;
        var userId3 = fixture.user3._id;

        return Promise.join(
          roomMembershipService.addRoomMember(troupeId3, userId1, roomMembershipFlags.MODES.all),
          roomMembershipService.addRoomMember(
            troupeId3,
            userId2,
            roomMembershipFlags.MODES.announcement
          ),
          roomMembershipService.addRoomMember(troupeId3, userId3, roomMembershipFlags.MODES.mute)
        )
          .then(function() {
            return roomMembershipService.findMembersForRoomWithLurk(troupeId3);
          })
          .then(function(result) {
            var expected = {};
            expected[userId1] = false;
            expected[userId2] = false;
            expected[userId3] = true;
            assert.deepEqual(result, expected);

            return roomMembershipService.getMembershipDetails(userId1, troupeId3);
          })
          .then(function(result) {
            assert.strictEqual(result.flags, roomMembershipFlags.MODES.all);
            return roomMembershipService.getMembershipDetails(userId2, troupeId3);
          })
          .then(function(result) {
            assert.strictEqual(result.flags, roomMembershipFlags.MODES.announcement);
            return roomMembershipService.getMembershipDetails(userId3, troupeId3);
          })
          .then(function(result) {
            assert.strictEqual(result.flags, roomMembershipFlags.MODES.mute);
          });
      });
    });

    describe('removeRoomMembers', function() {
      it('should allow users to be removed from a room', function() {
        var flags = roomMembershipFlags.MODES.all;

        return Promise.join(
          roomMembershipService.addRoomMember(fixture.troupe2.id, fixture.user1.id, flags),
          roomMembershipService.addRoomMember(fixture.troupe2.id, fixture.user2.id, flags)
        )
          .then(function() {
            return persistence.Troupe.findById(fixture.troupe2.id).exec();
          })
          .then(function(troupe) {
            assert.strictEqual(troupe.userCount, 2);
            return roomMembershipService.removeRoomMembers(fixture.troupe2.id, [fixture.user1.id]);
          })
          .then(function() {
            return roomMembershipService.countMembersInRoom(fixture.troupe2.id);
          })
          .then(function(count) {
            assert.strictEqual(count, 1);
            return persistence.Troupe.findById(fixture.troupe2.id).exec();
          })
          .then(function(troupe) {
            assert.strictEqual(troupe.userCount, 1);

            return roomMembershipService.checkRoomMembership(fixture.troupe2.id, fixture.user2.id);
          })
          .then(function(member) {
            assert(member);
            return roomMembershipService.checkRoomMembership(fixture.troupe2.id, fixture.user1.id);
          })
          .then(function(member) {
            assert(!member);
          });
      });
    });

    describe('membership modes', function() {
      beforeEach(function() {
        this.onMembersLurkChange = sinon.spy();

        roomMembershipService.events.on('members.lurk.change', this.onMembersLurkChange);
      });

      afterEach(function() {
        roomMembershipService.events.removeListener(
          'members.lurk.change',
          this.onMembersLurkChange
        );
      });

      it('should handle lurk status alongside membership mode mute', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService
          .removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMember(
              troupeId2,
              userId1,
              roomMembershipFlags.MODES.all
            );
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'mute');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(1, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(0);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(true, spyCall.args[2]);

            return roomMembershipService.getMembershipDetails(userId1, troupeId2);
          })
          .then(function(modeExtended) {
            assert.deepEqual(modeExtended, {
              mode: 'mute',
              lurk: true,
              flags: parseInt('110', 2),
              unread: false,
              activity: true,
              announcement: false,
              mention: true,
              desktop: false,
              mobile: false,
              default: false
            });
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
          });
      });

      it('should handle lurk status alongside membership mode announcement', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService
          .removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMember(
              troupeId2,
              userId1,
              roomMembershipFlags.MODES.all
            );
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'announcement');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(0, this.onMembersLurkChange.callCount);
            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'announcement');
            return roomMembershipService.getMembershipDetails(userId1, troupeId2);
          })
          .then(function(modeExtended) {
            assert.deepEqual(modeExtended, {
              mode: 'announcement',
              lurk: false,
              flags: parseInt('1101', 2),
              unread: true,
              activity: false,
              announcement: true,
              mention: true,
              desktop: false,
              mobile: false,
              default: false
            });

            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'mute');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(1, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(0);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(true, spyCall.args[2]);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'mute');
            return roomMembershipService.getMembershipDetails(userId1, troupeId2);
          })
          .then(function(modeExtended) {
            assert.deepEqual(modeExtended, {
              mode: 'mute',
              lurk: true,
              flags: parseInt('0110', 2),
              unread: false,
              activity: true,
              announcement: false,
              mention: true,
              desktop: false,
              mobile: false,
              default: false
            });

            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
          });
      });

      it('should handle lurk status alongside membership mode all', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService
          .removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMember(
              troupeId2,
              userId1,
              roomMembershipFlags.MODES.all
            );
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
          })
          .then(function() {
            assert.strictEqual(0, this.onMembersLurkChange.callCount);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'all');
            return roomMembershipService.getMembershipDetails(userId1, troupeId2);
          })
          .then(function(modeExtended) {
            assert.deepEqual(modeExtended, {
              mode: 'all',
              lurk: false,
              flags: parseInt('1101101', 2),
              unread: true,
              activity: false,
              announcement: true,
              mention: true,
              desktop: true,
              mobile: true,
              default: false
            });
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
          });
      });

      it('should handle transitions to and from lurk mode', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService
          .removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMember(
              troupeId2,
              userId1,
              roomMembershipFlags.MODES.all
            );
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
          })
          .then(function() {
            assert.strictEqual(0, this.onMembersLurkChange.callCount);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'all');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'mute');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(1, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(0);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(true, spyCall.args[2]);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'mute');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(2, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(1);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(false, spyCall.args[2]);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'all');
            return roomMembershipService.getMembershipDetails(userId1, troupeId2);
          })
          .then(function(modeExtended) {
            assert.deepEqual(modeExtended, {
              mode: 'all',
              lurk: false,
              flags: parseInt('1101101', 2),
              unread: true,
              activity: false,
              announcement: true,
              mention: true,
              desktop: true,
              mobile: true,
              default: false
            });

            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
          });
      });
    });

    describe('findMembersForRoom', function() {
      it('findMembersForRoom should handle skip and limit', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;

        var flags = roomMembershipFlags.MODES.all;

        return Promise.join(
          roomMembershipService.addRoomMember(troupeId2, userId1, flags),
          roomMembershipService.addRoomMember(troupeId2, userId2, flags)
        ).then(function() {
          return Promise.join(
            roomMembershipService.findMembersForRoom(troupeId2, { limit: 1 }),
            roomMembershipService.findMembersForRoom(troupeId2, { skip: 1, limit: 1 }),
            function(find1, find2) {
              assert.strictEqual(find1.length, 1);
              assert.strictEqual(find2.length, 1);

              assert(
                find1.some(mongoIdEqualPredicate(userId1)) ||
                  find2.some(mongoIdEqualPredicate(userId1))
              );
              assert(
                find1.some(mongoIdEqualPredicate(userId2)) ||
                  find2.some(mongoIdEqualPredicate(userId2))
              );
            }
          );
        });
      });
    });

    describe('findRoomIdsForUserWithLurk', function() {
      it('should return the correct values', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;
        var userId3 = fixture.user3.id;

        return Promise.join(
          roomMembershipService.addRoomMember(troupeId2, userId1, roomMembershipFlags.MODES.all),
          roomMembershipService.addRoomMember(
            troupeId2,
            userId2,
            roomMembershipFlags.MODES.announcement
          ),
          roomMembershipService.addRoomMember(troupeId2, userId3, roomMembershipFlags.MODES.mute)
        )
          .then(function() {
            return roomMembershipService.findRoomIdsForUserWithLurk(userId1);
          })
          .then(function(result) {
            assert(typeof result === 'object');
            assert(!!result);
            assert(result.hasOwnProperty(troupeId2));
            assert.strictEqual(result[troupeId2], false);

            return roomMembershipService.findRoomIdsForUserWithLurk(userId2);
          })
          .then(function(result) {
            assert(typeof result === 'object');
            assert(result.hasOwnProperty(troupeId2));
            assert.strictEqual(result[troupeId2], false);

            return roomMembershipService.findRoomIdsForUserWithLurk(userId3);
          })
          .then(function(result) {
            assert(typeof result === 'object');
            assert(result.hasOwnProperty(troupeId2));
            assert.strictEqual(result[troupeId2], true);
          });
      });
    });

    describe('findLurkingRoomIdsForUserId', function() {
      it('should return rooms in which a user is lurking', function() {
        var troupeId1 = fixture.troupe1.id;
        var troupeId2 = fixture.troupe2.id;
        var troupeId3 = fixture.troupe3.id;
        var userId1 = fixture.user1.id;

        return Promise.join(
          roomMembershipService.removeRoomMember(troupeId1, userId1),
          roomMembershipService.removeRoomMember(troupeId2, userId1),
          roomMembershipService.removeRoomMember(troupeId3, userId1)
        )
          .then(function() {
            return Promise.join(
              roomMembershipService.addRoomMember(
                troupeId1,
                userId1,
                roomMembershipFlags.MODES.all
              ),
              roomMembershipService.addRoomMember(
                troupeId2,
                userId1,
                roomMembershipFlags.MODES.announcement
              ),
              roomMembershipService.addRoomMember(
                troupeId3,
                userId1,
                roomMembershipFlags.MODES.mute
              )
            );
          })
          .then(function() {
            return roomMembershipService.findLurkingRoomIdsForUserId(userId1);
          })
          .then(function(troupeIds) {
            assert.strictEqual(troupeIds.length, 1);
            assert.strictEqual(String(troupeIds[0]), troupeId3);
          });
      });
    });

    describe('addRoomMember', function() {
      it('should add a new member to a room', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener(pTroupeId, members) {
          assert.strictEqual(pTroupeId, troupeId);
          assert.deepEqual(members, [userId]);
          called++;
        }

        return roomMembershipService
          .removeRoomMember(troupeId, userId)
          .then(function() {
            roomMembershipService.events.on('members.added', listener);
            return roomMembershipService.addRoomMember(
              troupeId,
              userId,
              roomMembershipFlags.MODES.all
            );
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            assert.strictEqual(called, 1);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.added', listener);
          });
      });

      it('should be idempotent', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener() {
          called++;
        }

        return roomMembershipService
          .addRoomMember(troupeId, userId, roomMembershipFlags.MODES.all)
          .then(function() {
            roomMembershipService.events.on('members.added', listener);
            return roomMembershipService.addRoomMember(
              troupeId,
              userId,
              roomMembershipFlags.MODES.all
            );
          })
          .then(function(result) {
            assert.strictEqual(result, false);
            assert.strictEqual(called, 0);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.added', listener);
          });
      });
    });

    describe('findUserMembershipInRooms', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var troupeId2 = fixture.troupe2.id;
        var userId = fixture.user1.id;

        return Promise.join(
          roomMembershipService.removeRoomMember(troupeId1, userId),
          roomMembershipService.addRoomMember(troupeId2, userId, roomMembershipFlags.MODES.all),
          function() {
            return roomMembershipService.findUserMembershipInRooms(userId, [troupeId1, troupeId2]);
          }
        ).then(function(result) {
          assert.strictEqual(result.length, 1);
          assert.equal(result[0], troupeId2);
        });
      });
    });

    describe('findMembershipForUsersInRoom', function() {
      it('should return some users', function() {
        var troupeId = fixture.troupe1.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;

        return Promise.join(
          roomMembershipService.removeRoomMember(troupeId, userId1),
          roomMembershipService.addRoomMember(troupeId, userId2, roomMembershipFlags.MODES.all),
          function() {
            return roomMembershipService.findMembershipForUsersInRoom(troupeId, [userId1, userId2]);
          }
        ).then(function(result) {
          assert(Array.isArray(result));
          assert.strictEqual(result.length, 1);
          assert.equal(result[0], userId2);
        });
      });

      it('should return some users when a single user is added', function() {
        var troupeId = fixture.troupe1.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;

        return Promise.join(
          roomMembershipService.removeRoomMember(troupeId, userId1),
          roomMembershipService.addRoomMember(troupeId, userId2, roomMembershipFlags.MODES.all),
          function() {
            return roomMembershipService.findMembershipForUsersInRoom(troupeId, [userId2]);
          }
        ).then(function(result) {
          assert(Array.isArray(result));
          assert.strictEqual(result.length, 1);
          assert.equal(result[0], userId2);
        });
      });
    });

    describe('findMembersForRoomWithLurk', function() {
      it('should return some users with lurk', function() {
        var troupeId = fixture.troupe1.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;
        var userId3 = fixture.user3.id;

        return Promise.join(
          roomMembershipService.removeRoomMember(troupeId, userId1),
          roomMembershipService.addRoomMember(troupeId, userId2, roomMembershipFlags.MODES.all),
          roomMembershipService.addRoomMember(troupeId, userId3, roomMembershipFlags.MODES.all),
          function() {
            return [
              roomMembershipService.setMembershipMode(userId2, troupeId, 'all'),
              roomMembershipService.setMembershipMode(userId3, troupeId, 'mute')
            ];
          }
        )
          .spread(function() {
            return roomMembershipService.findMembersForRoomWithLurk(troupeId, [
              userId1,
              userId2,
              userId3
            ]);
          })
          .then(function(result) {
            var expected = {};
            expected[userId2] = false;
            expected[userId3] = true;
            assert.deepEqual(result, expected);
          });
      });
    });

    describe('removeRoomMember', function() {
      it('should remove a member from a room', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener(pTroupeId, members) {
          assert.strictEqual(pTroupeId, troupeId);
          assert.deepEqual(members, [userId]);
          called++;
        }

        return roomMembershipService
          .addRoomMember(troupeId, userId, roomMembershipFlags.MODES.all)
          .then(function() {
            roomMembershipService.events.on('members.removed', listener);

            return roomMembershipService.removeRoomMember(troupeId, userId);
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            assert.strictEqual(called, 1);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.removed', listener);
          });
      });

      it('should be idempotent', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener() {
          called++;
        }

        return roomMembershipService
          .removeRoomMember(troupeId, userId)
          .then(function() {
            roomMembershipService.events.on('members.removed', listener);
            return roomMembershipService.removeRoomMember(troupeId, userId);
          })
          .then(function(result) {
            assert.strictEqual(result, false);
            assert.strictEqual(called, 0);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.removed', listener);
          });
      });
    });

    describe('findAllMembersForRooms', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;
        var userId3 = fixture.user3.id;

        return Promise.join(
          roomMembershipService.removeRoomMember(troupeId1, userId3),
          roomMembershipService.removeRoomMember(troupeId2, userId3),
          roomMembershipService.addRoomMember(troupeId1, userId1, roomMembershipFlags.MODES.all),
          roomMembershipService.addRoomMember(
            troupeId1,
            userId2,
            roomMembershipFlags.MODES.announcement
          ),
          roomMembershipService.addRoomMember(troupeId2, userId1, roomMembershipFlags.MODES.mute),
          function() {
            return roomMembershipService.findAllMembersForRooms([troupeId1, troupeId2]);
          }
        ).then(function(result) {
          assert.strictEqual(result.length, 2);
          assert(result.some(mongoIdEqualPredicate(userId1)));
          assert(result.some(mongoIdEqualPredicate(userId2)));
          assert(!result.some(mongoIdEqualPredicate(userId3)));
        });
      });
    });

    describe('findMembersForRoomMulti', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;
        var userId3 = fixture.user3.id;

        return Promise.join(
          roomMembershipService.removeRoomMember(troupeId1, userId3),
          roomMembershipService.removeRoomMember(troupeId2, userId3),
          roomMembershipService.addRoomMember(troupeId1, userId1, roomMembershipFlags.MODES.all),
          roomMembershipService.addRoomMember(
            troupeId1,
            userId2,
            roomMembershipFlags.MODES.announcement
          ),
          roomMembershipService.addRoomMember(troupeId2, userId1, roomMembershipFlags.MODES.mute),
          roomMembershipService.removeRoomMember(troupeId2, userId2),
          function() {
            return roomMembershipService.findMembersForRoomMulti([troupeId1, troupeId2]);
          }
        ).then(function(result) {
          assert.strictEqual(Object.keys(result).length, 2);
          var t1 = result[troupeId1];
          var t2 = result[troupeId2];
          assert(Array.isArray(t1));
          assert(Array.isArray(t2));

          assert(t1.some(mongoIdEqualPredicate(userId1)));
          assert(t1.some(mongoIdEqualPredicate(userId2)));
          assert(!t1.some(mongoIdEqualPredicate(userId3)));

          assert(t2.some(mongoIdEqualPredicate(userId1)));
          assert(!t2.some(mongoIdEqualPredicate(userId2)));
          assert(!t2.some(mongoIdEqualPredicate(userId3)));
        });
      });
    });

    describe('setMembershipModeForUsersInRoom', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;

        return Promise.join(
          roomMembershipService.addRoomMember(troupeId1, userId1, roomMembershipFlags.MODES.mute),
          roomMembershipService.addRoomMember(troupeId1, userId2, roomMembershipFlags.MODES.mute),
          function() {
            return roomMembershipService.setMembershipModeForUsersInRoom(
              troupeId1,
              [userId1, userId2],
              'all'
            );
          }
        )
          .then(function() {
            return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [
              userId1,
              userId2
            ]);
          })
          .then(function(result) {
            var expected = {};
            expected[userId1] = 'all';
            expected[userId2] = 'all';
            assert.deepEqual(result, expected);

            return roomMembershipService.setMembershipModeForUsersInRoom(
              troupeId1,
              [userId1],
              'announcement'
            );
          })
          .then(function() {
            return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [
              userId1,
              userId2
            ]);
          })
          .then(function(result) {
            var expected = {};
            expected[userId1] = 'announcement';
            expected[userId2] = 'all';
            assert.deepEqual(result, expected);

            return roomMembershipService.setMembershipModeForUsersInRoom(
              troupeId1,
              [userId2],
              'mute'
            );
          })
          .then(function() {
            return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [
              userId1,
              userId2
            ]);
          })
          .then(function(result) {
            var expected = {};
            expected[userId1] = 'announcement';
            expected[userId2] = 'mute';
            assert.deepEqual(result, expected);

            return roomMembershipService.setMembershipModeForUsersInRoom(
              troupeId1,
              [userId1, userId2],
              'all'
            );
          })
          .then(function() {
            return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [
              userId1,
              userId2
            ]);
          })
          .then(function(result) {
            var expected = {};
            expected[userId1] = 'all';
            expected[userId2] = 'all';
            assert.deepEqual(result, expected);
          });
      });
    });

    describe('findMembersForRoomForNotify', function() {
      var troupeId1, userId1, userId2, userId3;

      function roomForNotifySort(a, b) {
        var u1 = a.userId;
        var u2 = b.userId;
        if (u1 === u2) {
          return 0;
        } else {
          return u1 > u2 ? 1 : -1;
        }
      }

      function equivalentValues(array, expected) {
        var keys = Object.keys(expected);
        assert.strictEqual(
          array.length,
          keys.length,
          'Expected ' + keys.length + ' items, got ' + array.length
        );
        array.forEach(function(item) {
          var expectedItem = expected[item.userId];
          assert(expectedItem !== undefined, 'Item for user ' + item.userId + ' does not exist');
          assert.strictEqual(item.flags, expectedItem);
        });
      }

      before(function() {
        troupeId1 = fixture.troupe1.id;
        userId1 = fixture.user1._id;
        userId2 = fixture.user2._id;
        userId3 = fixture.user3._id;

        return Promise.join(
          roomMembershipService.addRoomMember(troupeId1, userId1, roomMembershipFlags.MODES.all),
          roomMembershipService.addRoomMember(
            troupeId1,
            userId2,
            roomMembershipFlags.MODES.announcement
          ),
          roomMembershipService.addRoomMember(troupeId1, userId3, roomMembershipFlags.MODES.mute),
          function() {
            return Promise.join(
              roomMembershipService.setMembershipModeForUsersInRoom(troupeId1, [userId1], 'all'),
              roomMembershipService.setMembershipModeForUsersInRoom(
                troupeId1,
                [userId2],
                'announcement'
              ),
              roomMembershipService.setMembershipModeForUsersInRoom(troupeId1, [userId3], 'mute')
            );
          }
        );
      });

      it('should return notify users', function() {
        // No announcement, no
        return roomMembershipService
          .findMembersForRoomForNotify(troupeId1, null)
          .then(function(result) {
            result.sort(roomForNotifySort);
            var expected = {};
            expected[userId1] = roomMembershipFlags.MODES.all;
            expected[userId2] = roomMembershipFlags.MODES.announcement;
            expected[userId3] = roomMembershipFlags.MODES.mute;

            equivalentValues(result, expected);
          });
      });

      it('should not return the sender', function() {
        // No announcement, no
        return roomMembershipService
          .findMembersForRoomForNotify(troupeId1, userId1)
          .then(function(result) {
            result.sort(roomForNotifySort);
            var expected = {};
            expected[userId2] = roomMembershipFlags.MODES.announcement;
            expected[userId3] = roomMembershipFlags.MODES.mute;

            equivalentValues(result, expected);
          });
      });

      it('should return notify users and announce users', function() {
        return roomMembershipService
          .findMembersForRoomForNotify(troupeId1, null, true)
          .then(function(result) {
            var expected = {};
            expected[userId1] = roomMembershipFlags.MODES.all;
            expected[userId2] = roomMembershipFlags.MODES.announcement;
            expected[userId3] = roomMembershipFlags.MODES.mute;

            equivalentValues(result, expected);
          });
      });

      it('should return notify users and mention users who are already notify users', function() {
        return roomMembershipService
          .findMembersForRoomForNotify(troupeId1, null, false, [userId1])
          .then(function(result) {
            var expected = {};
            expected[userId1] = roomMembershipFlags.MODES.all;
            expected[userId2] = roomMembershipFlags.MODES.announcement;
            expected[userId3] = roomMembershipFlags.MODES.mute;

            equivalentValues(result, expected);
          });
      });

      it('should return notify users and mention users who are announcement users', function() {
        return roomMembershipService
          .findMembersForRoomForNotify(troupeId1, null, false, [userId2])
          .then(function(result) {
            var expected = {};
            expected[userId1] = roomMembershipFlags.MODES.all;
            expected[userId2] = roomMembershipFlags.MODES.announcement;
            expected[userId3] = roomMembershipFlags.MODES.mute;

            equivalentValues(result, expected);
          });
      });

      it('should return notify users and mention users who are announcement users', function() {
        return roomMembershipService
          .findMembersForRoomForNotify(troupeId1, null, false, [userId3])
          .then(function(result) {
            var expected = {};
            expected[userId1] = roomMembershipFlags.MODES.all;
            expected[userId2] = roomMembershipFlags.MODES.announcement;
            expected[userId3] = roomMembershipFlags.MODES.mute;

            equivalentValues(result, expected);
          });
      });

      it('should return notify users and mention users who are mute users', function() {
        return roomMembershipService
          .findMembersForRoomForNotify(troupeId1, null, true, [userId3])
          .then(function(result) {
            var expected = {};
            expected[userId1] = roomMembershipFlags.MODES.all;
            expected[userId2] = roomMembershipFlags.MODES.announcement;
            expected[userId3] = roomMembershipFlags.MODES.mute;

            equivalentValues(result, expected);
          });
      });
    });

    describe('groupMembership change notification', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        user2: {},
        user3: {},
        user4: {},
        user5: {},
        user6: {},
        group1: {},
        troupe1: { security: 'PUBLIC', group: 'group1', users: ['user3', 'user5', 'user6'] },
        troupe2: { security: 'PUBLIC', group: 'group1', users: ['user2', 'user4', 'user5'] }
      });
      var _onAdded;
      var onAdded;
      var _onRemoved;
      var onRemoved;

      beforeEach(function() {
        _onAdded = function() {
          if (onAdded) {
            return onAdded.apply(null, arguments);
          }

          assert.ok(false, 'Unexpected add');
        };

        _onRemoved = function() {
          if (onRemoved) {
            return onRemoved.apply(null, arguments);
          }

          assert.ok(false, 'Unexpected remove');
        };

        roomMembershipService.events.on('group.members.added', _onAdded);
        roomMembershipService.events.on('group.members.removed', _onRemoved);
      });

      afterEach(function() {
        roomMembershipService.events.removeListener('group.members.added', _onAdded);
        roomMembershipService.events.removeListener('group.members.removed', _onRemoved);
        onAdded = null;
        onRemoved = null;
      });

      it('should notify when a user joins a new group', function() {
        var troupeId = fixture.troupe1._id;
        var userId = fixture.user1._id;
        var groupId = fixture.group1._id;

        var p = new Promise(function(resolve) {
          onAdded = function(pGroupId, pUserIds) {
            assert.strictEqual(pGroupId, groupId);
            assert.deepEqual(pUserIds, [userId]);
            resolve();
          };
        });

        return roomMembershipService
          .addRoomMember(troupeId, userId, roomMembershipFlags.MODES.all, groupId)
          .then(function() {
            return p;
          });
      });

      it('should not notify when a user joins a new room for a group they are already in', function() {
        var troupeId = fixture.troupe1._id;
        var userId = fixture.user2._id;
        var groupId = fixture.group1._id;

        return roomMembershipService
          .addRoomMember(troupeId, userId, roomMembershipFlags.MODES.all, groupId)
          .delay(10); // Give the caller time to fire the event
      });

      it('should notify when a user leaves a room and its the last room in that group theyre a member of', function() {
        var troupeId = fixture.troupe1._id;
        var userId = fixture.user3._id;
        var groupId = fixture.group1._id;

        var p = new Promise(function(resolve) {
          onRemoved = function(pGroupId, pUserIds) {
            assert.strictEqual(pGroupId, groupId);
            assert.deepEqual(pUserIds, [userId]);
            resolve();
          };
        });

        return roomMembershipService.removeRoomMember(troupeId, userId, groupId).then(function() {
          return p;
        });
      });

      it('should not notify when a user leaves a room and its not the last room in that group theyre a member of', function() {
        var troupeId = fixture.troupe1._id;
        var userId = fixture.user4._id;
        var groupId = fixture.group1._id;

        return roomMembershipService.removeRoomMember(troupeId, userId, groupId).delay(10); // Give the caller time to fire the event
      });

      it('should emit events when multiple room members are removed at once', function() {
        var troupeId = fixture.troupe1._id;
        var userId5 = fixture.user5._id;
        var userId6 = fixture.user6._id;
        var groupId = fixture.group1._id;

        var p = new Promise(function(resolve) {
          onRemoved = function(pGroupId, pUserIds) {
            assert.strictEqual(pGroupId, groupId);
            assert.deepEqual(pUserIds, [userId6]);
            resolve();
          };
        });

        return roomMembershipService
          .removeRoomMembers(troupeId, [userId5, userId6], groupId)
          .then(function() {
            return p;
          });
      });
    });

    describe('findPrivateRoomIdsForUser', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        user2: {},
        troupe1: {
          securityDescriptor: {
            public: false
          },
          users: ['user1']
        },
        troupe2: {
          securityDescriptor: {
            public: true
          },
          users: ['user2', 'user1']
        },
        troupe3: {
          securityDescriptor: {
            public: false
          },
          users: ['user1']
        }
      });

      function contains(ids, expectedIds) {
        return expectedIds.every(function(expectedId) {
          return ids.some(function(x) {
            return String(expectedId) === String(x);
          });
        });
      }

      it('should find private rooms', function() {
        var userId1 = fixture.user1.id;

        return roomMembershipService.findPrivateRoomIdsForUser(userId1).then(function(roomIds) {
          assert.strictEqual(roomIds.length, 2);
          assert(contains(roomIds, [fixture.troupe1.id, fixture.troupe3.id]));
        });
      });

      it('should handle users without private rooms', function() {
        var userId1 = fixture.user2.id;

        return roomMembershipService.findPrivateRoomIdsForUser(userId1).then(function(roomIds) {
          assert.deepEqual(roomIds, []);
        });
      });
    });
  });
});
