'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var roomMembershipFlags = require('../lib/room-membership-flags');
var userDefaultFlagsService = require('../lib/user-default-flags-service');
var userDefaultFlagsUpdateService = require('../lib/user-default-flags-update-service');

describe('user-default-flags', function() {
  describe('useOneToOneDefaultWhenMute', function() {
    var FIXTURES = [
      {
        name: 'all',
        flags: roomMembershipFlags.MODES.all,
        expected: roomMembershipFlags.MODES.all
      },
      {
        name: 'annoucement',
        flags: roomMembershipFlags.MODES.all,
        expected: roomMembershipFlags.MODES.all
      },
      {
        name: 'mute',
        flags: roomMembershipFlags.MODES.mute,
        expected: roomMembershipFlags.DEFAULT_ONE_TO_ONE_FLAGS_WHEN_MUTE
      }
    ];

    describe('without default flag', function() {
      FIXTURES.forEach(function(meta) {
        it(meta.name, function() {
          var result = userDefaultFlagsService.testOnly.useOneToOneDefaultWhenMute(meta.flags);
          assert.strictEqual(result, meta.expected);
        });
      });
    });

    describe('strips off the default flag', function() {
      FIXTURES.forEach(function(meta) {
        it(meta.name, function() {
          var flags = roomMembershipFlags.addDefaultFlag(meta.flags);
          var result = userDefaultFlagsService.testOnly.useOneToOneDefaultWhenMute(flags);
          assert.strictEqual(result, meta.expected);
        });
      });
    });
  });

  describe('#slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {}
    });

    describe('getDefaultFlagsForUserId', function() {
      it('should handle users without a default', function() {
        var userId1 = fixture.user1._id;

        return userDefaultFlagsService
          .setDefaultFlagsForUserId(userId1, null)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, roomMembershipFlags.DEFAULT_USER_FLAGS);
          });
      });

      it('should handle users with a value', function() {
        var userId1 = fixture.user1._id;

        return userDefaultFlagsService
          .setDefaultFlagsForUserId(userId1, 1)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, 1);
          });
      });
    });

    describe('getDefaultFlagsForUserIds', function() {
      it('should handle users without a default', function() {
        var userId1 = fixture.user1._id;
        var userId2 = fixture.user2._id;

        return Promise.join(
          userDefaultFlagsService.setDefaultFlagsForUserId(userId1, null),
          userDefaultFlagsService.setDefaultFlagsForUserId(userId2, null)
        )
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserIds([userId1, userId2]);
          })
          .then(function(flags) {
            var expected = [];
            expected[userId1] = roomMembershipFlags.DEFAULT_USER_FLAGS;
            expected[userId2] = roomMembershipFlags.DEFAULT_USER_FLAGS;
            assert.deepEqual(flags, expected);
          });
      });

      it('should handle users with a value', function() {
        var userId1 = fixture.user1._id;
        var userId2 = fixture.user2._id;

        return Promise.join(
          userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 1),
          userDefaultFlagsService.setDefaultFlagsForUserId(userId2, 2)
        )
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserIds([userId1, userId2]);
          })
          .then(function(flags) {
            var expected = [];
            expected[userId1] = 1;
            expected[userId2] = 2;
            assert.deepEqual(flags, expected);
          });
      });
    });

    describe('setDefaultFlagsForUserId', function() {
      it('should handle setting and unsetting the value', function() {
        var userId1 = fixture.user1._id;

        return userDefaultFlagsService
          .setDefaultFlagsForUserId(userId1, null)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, roomMembershipFlags.DEFAULT_USER_FLAGS);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 1);
          })
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, 1);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 2);
          })
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, 2);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, null);
          })
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, roomMembershipFlags.DEFAULT_USER_FLAGS);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 1);
          });
      });
    });

    describe('getDefaultFlagDetailsForUserId', function() {
      it('should handle users who have not changed their default', function() {
        var user3 = fixture.user3;

        return userDefaultFlagsService
          .getDefaultFlagDetailsForUserId(user3._id)
          .then(function(details) {
            assert.deepEqual(details, {
              activity: false,
              announcement: true,
              desktop: true,
              flags: 125,
              lurk: false,
              mention: true,
              mobile: true,
              mode: 'all',
              unread: true
            });
          });
      });

      it('should handle users who have changed their default to all', function() {
        var user1 = fixture.user1;
        return userDefaultFlagsUpdateService
          .updateDefaultModeForUser(user1, 'all', false)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagDetailsForUserId(user1._id);
          })
          .then(function(details) {
            assert.deepEqual(details, {
              activity: false,
              announcement: true,
              desktop: true,
              flags: 125,
              lurk: false,
              mention: true,
              mobile: true,
              mode: 'all',
              unread: true
            });
          });
      });

      it('should handle users who have changed their default to announcement', function() {
        var user1 = fixture.user1;
        return userDefaultFlagsUpdateService
          .updateDefaultModeForUser(user1, 'announcement', false)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagDetailsForUserId(user1._id);
          })
          .then(function(details) {
            assert.deepEqual(details, {
              activity: false,
              announcement: true,
              desktop: false,
              flags: 29,
              lurk: false,
              mention: true,
              mobile: false,
              mode: 'announcement',
              unread: true
            });
          });
      });

      it('should handle users who have changed their default to mute', function() {
        var user1 = fixture.user1;
        return userDefaultFlagsUpdateService
          .updateDefaultModeForUser(user1, 'mute', false)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagDetailsForUserId(user1._id);
          })
          .then(function(details) {
            assert.deepEqual(details, {
              activity: true,
              announcement: false,
              desktop: false,
              flags: 22,
              lurk: true,
              mention: true,
              mobile: false,
              mode: 'mute',
              unread: false
            });
          });
      });
    });
  });
});
