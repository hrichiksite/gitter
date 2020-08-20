'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var userRoomModeUpdateService = require('../lib/user-room-mode-update-service');
var userDefaultFlagsUpdateService = require('../lib/user-default-flags-update-service');
var roomMembershipService = require('../lib/room-membership-service');

describe('user-room-mode-update-service', function() {
  describe('#slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      troupe1: { users: ['user1', 'user2', 'user3'] }
    });

    describe('updateModeForUserInRoom', function() {
      describe('default', function() {
        [null, 'all', 'announcement', 'mute'].forEach(function(defaultMode) {
          it(
            "should handle updating the user to the user default of '" + defaultMode + "'",
            function() {
              var user1 = fixture.user1;
              var userId1 = user1._id;
              var troupeId1 = fixture.troupe1._id;

              return (defaultMode
                ? userDefaultFlagsUpdateService.updateDefaultModeForUser(user1, defaultMode, false)
                : Promise.resolve()
              )
                .then(function() {
                  return userRoomModeUpdateService.setModeForUserInRoom(
                    user1,
                    troupeId1,
                    'default'
                  );
                })
                .then(function() {
                  return roomMembershipService.getMembershipDetails(userId1, troupeId1);
                })
                .then(function(details) {
                  assert.strictEqual(details.default, true);
                  assert.strictEqual(details.lurk, defaultMode === 'mute');
                  if (defaultMode) {
                    assert.strictEqual(details.mode, defaultMode);
                  } else {
                    assert.strictEqual(details.mode, 'all');
                  }
                });
            }
          );
        });
      });

      describe('non-default', function() {
        ['all', 'announcement', 'mute'].forEach(function(mode) {
          it("should handle updating the user to '" + mode + "'", function() {
            var user1 = fixture.user1;
            var userId1 = user1._id;
            var troupeId1 = fixture.troupe1._id;

            return userRoomModeUpdateService
              .setModeForUserInRoom(user1, troupeId1, mode)
              .then(function() {
                return roomMembershipService.getMembershipDetails(userId1, troupeId1);
              })
              .then(function(details) {
                assert.strictEqual(details.default, false);
                assert.strictEqual(details.lurk, mode === 'mute');
                assert.strictEqual(details.mode, mode);
              });
          });
        });
      });
    });
  });
});
