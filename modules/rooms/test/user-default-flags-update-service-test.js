'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var userDefaultFlagsUpdateService = require('../lib/user-default-flags-update-service');
var userDefaultFlagsService = require('../lib/user-default-flags-service');
var roomMembershipService = require('../lib/room-membership-service');
var roomMembershipFlags = require('../lib/room-membership-flags');
var roomService = require('../lib/room-service');

describe('user-default-flags-update-service', function() {
  describe('#slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      troupe1: {
        security: 'PUBLIC',
        githubType: 'USER_CHANNEL'
      },
      troupe2: {
        security: 'PUBLIC',
        githubType: 'USER_CHANNEL'
      },
      troupe3: {
        security: 'PUBLIC',
        githubType: 'USER_CHANNEL'
      }
    });

    describe('updateDefaultModeForUser', function() {
      it('should affect future room join operations', function() {
        var user1 = fixture.user1;
        var troupe1 = fixture.troupe1;
        var userId1 = user1._id;
        var troupeId1 = troupe1._id;

        return roomMembershipService
          .removeRoomMembers(troupeId1, [userId1])
          .then(function() {
            return userDefaultFlagsUpdateService.updateDefaultModeForUser(user1, 'mute');
          })
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            var mode = roomMembershipFlags.getModeFromFlags(flags);
            assert(mode, 'mute');

            return roomService.joinRoom(troupe1, user1, {});
          })
          .then(function() {
            return roomMembershipService.getMembershipDetails(userId1, troupeId1);
          })
          .then(function(membershipDefaults) {
            assert.strictEqual(membershipDefaults.mode, 'mute');
          });
      });

      it('should update the rooms the user is currently in when they are default', function() {
        var user1 = fixture.user1;
        var userId1 = user1._id;
        var troupeId1 = fixture.troupe1._id;
        var troupeId2 = fixture.troupe2._id;
        var troupeId3 = fixture.troupe3._id;

        return Promise.join(
          roomMembershipService.removeRoomMembers(troupeId1, [userId1]),
          roomMembershipService.removeRoomMembers(troupeId2, [userId1]),
          roomMembershipService.removeRoomMembers(troupeId3, [userId1])
        )
          .then(function() {
            return Promise.join(
              roomMembershipService.addRoomMember(
                troupeId1,
                userId1,
                roomMembershipFlags.getFlagsForMode('all', true)
              ),
              roomMembershipService.addRoomMember(
                troupeId2,
                userId1,
                roomMembershipFlags.getFlagsForMode('announcement', true)
              ),
              roomMembershipService.addRoomMember(
                troupeId3,
                userId1,
                roomMembershipFlags.getFlagsForMode('mute', true)
              )
            );
          })
          .then(function() {
            return userDefaultFlagsUpdateService.updateDefaultModeForUser(user1, 'mute', false); // Only override defaults
          })
          .then(function() {
            return Promise.join(
              roomMembershipService.getMembershipDetails(userId1, troupeId1),
              roomMembershipService.getMembershipDetails(userId1, troupeId2),
              roomMembershipService.getMembershipDetails(userId1, troupeId3),
              function(d1, d2, d3) {
                assert.strictEqual(d1.mode, 'mute');
                assert.strictEqual(d2.mode, 'mute');
                assert.strictEqual(d3.mode, 'mute');
              }
            );
          });
      });

      it('should not update the rooms the user is currently in when they are default', function() {
        var user1 = fixture.user1;
        var userId1 = user1._id;
        var troupeId1 = fixture.troupe1._id;
        var troupeId2 = fixture.troupe2._id;
        var troupeId3 = fixture.troupe3._id;

        return Promise.join(
          roomMembershipService.removeRoomMembers(troupeId1, [userId1]),
          roomMembershipService.removeRoomMembers(troupeId2, [userId1]),
          roomMembershipService.removeRoomMembers(troupeId3, [userId1])
        )
          .then(function() {
            return Promise.join(
              roomMembershipService.addRoomMember(
                troupeId1,
                userId1,
                roomMembershipFlags.getFlagsForMode('all', false)
              ),
              roomMembershipService.addRoomMember(
                troupeId2,
                userId1,
                roomMembershipFlags.getFlagsForMode('announcement', false)
              ),
              roomMembershipService.addRoomMember(
                troupeId3,
                userId1,
                roomMembershipFlags.getFlagsForMode('mute', false)
              )
            );
          })
          .then(function() {
            return userDefaultFlagsUpdateService.updateDefaultModeForUser(user1, 'mute', false); // Only override defaults
          })
          .then(function() {
            return Promise.join(
              roomMembershipService.getMembershipDetails(userId1, troupeId1),
              roomMembershipService.getMembershipDetails(userId1, troupeId2),
              roomMembershipService.getMembershipDetails(userId1, troupeId3),
              function(d1, d2, d3) {
                assert.strictEqual(d1.mode, 'all');
                assert.strictEqual(d2.mode, 'announcement');
                assert.strictEqual(d3.mode, 'mute');
              }
            );
          });
      });
    });
  });
});
