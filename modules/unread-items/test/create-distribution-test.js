'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var mockito = require('jsmockito').JsMockito;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var assert = require('assert');
var blockTimer = require('gitter-web-test-utils/lib/block-timer');

describe('create-distribution', function() {
  before(blockTimer.on);
  after(blockTimer.off);

  describe('createDistribution', function() {
    var troupeId;
    var fromUserId;
    var userId1;
    var userId2;
    var userId3;
    var roomMembershipService;
    var createPolicyForUserIdInRoom;
    var createDistribution;
    var troupe;
    var troupeNotifyArray;
    var MockDistribution;
    var categoriseUserInRoom;

    beforeEach(function() {
      troupeId = mongoUtils.getNewObjectIdString() + '';
      fromUserId = mongoUtils.getNewObjectIdString() + '';
      userId1 = mongoUtils.getNewObjectIdString() + '';
      userId2 = mongoUtils.getNewObjectIdString() + '';
      userId3 = mongoUtils.getNewObjectIdString() + '';

      troupe = {
        id: troupeId,
        _id: troupeId,
        sd: {}
      };
      troupeNotifyArray = [{ userId: userId1, flags: 1 }, { userId: userId2, flags: 2 }];

      roomMembershipService = mockito.mock(require('gitter-web-rooms/lib/room-membership-service'));
      createPolicyForUserIdInRoom = mockito.mockFunction();

      MockDistribution = function(options) {
        this.options = options;
      };

      mockito
        .when(roomMembershipService)
        .findMembersForRoomForNotify(troupeId)
        .thenReturn(Promise.resolve(troupeNotifyArray));

      categoriseUserInRoom = function(troupeId, userIds) {
        return Promise.resolve({ troupeId: troupeId, userIds: userIds });
      };

      createDistribution = proxyquireNoCallThru('../lib/create-distribution', {
        'gitter-web-rooms/lib/room-membership-service': roomMembershipService,
        './distribution': MockDistribution,
        './categorise-users-in-room': categoriseUserInRoom,
        'gitter-web-permissions/lib/policy-factory': {
          createPolicyForUserIdInRoom: createPolicyForUserIdInRoom
        }
      });
    });

    it('should create a distribution with no mentions', function() {
      return createDistribution(fromUserId, troupe, []).then(function(result) {
        assert.deepEqual(result.options, {
          announcement: false,
          membersWithFlags: [
            {
              flags: 1,
              userId: userId1
            },
            {
              flags: 2,
              userId: userId2
            }
          ],
          presence: {
            troupeId: troupeId,
            userIds: [userId1, userId2]
          }
        });
      });
    });

    it('should create a distribution with single user mentions', function() {
      return createDistribution(fromUserId, troupe, [{ userId: userId1 }]).then(function(result) {
        assert.deepEqual(result.options, {
          announcement: false,
          membersWithFlags: [
            {
              flags: 1,
              userId: userId1
            },
            {
              flags: 2,
              userId: userId2
            }
          ],
          mentions: [userId1],
          nonMemberMentions: [],
          presence: {
            troupeId: troupeId,
            userIds: [userId1, userId2]
          }
        });
      });
    });

    it('should create a distribution with a single group mention', function() {
      return createDistribution(fromUserId, troupe, [
        { group: true, userIds: [userId1, userId2] }
      ]).then(function(result) {
        assert.deepEqual(result.options, {
          announcement: false,
          membersWithFlags: [
            {
              flags: 1,
              userId: userId1
            },
            {
              flags: 2,
              userId: userId2
            }
          ],
          mentions: [userId1, userId2],
          nonMemberMentions: [],
          presence: {
            troupeId: troupeId,
            userIds: [userId1, userId2]
          }
        });
      });
    });

    it('should create a distribution with a single announcement mention', function() {
      return createDistribution(fromUserId, troupe, [{ group: true, announcement: true }]).then(
        function(result) {
          assert.deepEqual(result.options, {
            announcement: true,
            membersWithFlags: [
              {
                flags: 1,
                userId: userId1
              },
              {
                flags: 2,
                userId: userId2
              }
            ],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
        }
      );
    });

    it('should create a distribution with an announcement and a mention', function() {
      return createDistribution(fromUserId, troupe, [
        { group: true, announcement: true },
        { userId: userId1 }
      ]).then(function(result) {
        assert.deepEqual(result.options, {
          announcement: true,
          membersWithFlags: [
            {
              flags: 1,
              userId: userId1
            },
            {
              flags: 2,
              userId: userId2
            }
          ],
          mentions: [userId1],
          nonMemberMentions: [],
          presence: {
            troupeId: troupeId,
            userIds: [userId1, userId2]
          }
        });
      });
    });

    it('should create a distribution with mentions to non members who are allowed in the room', function() {
      mockito
        .when(createPolicyForUserIdInRoom)(userId3, troupe)
        .thenReturn(
          Promise.resolve({
            canJoin: function() {
              return true;
            }
          })
        );

      return createDistribution(fromUserId, troupe, [{ userId: userId3 }]).then(function(result) {
        assert.deepEqual(result.options, {
          announcement: false,
          membersWithFlags: [
            {
              flags: 1,
              userId: userId1
            },
            {
              flags: 2,
              userId: userId2
            },
            {
              flags: null,
              userId: userId3
            }
          ],
          mentions: [userId3],
          nonMemberMentions: [userId3],
          presence: {
            troupeId: troupeId,
            userIds: [userId1, userId2, userId3]
          }
        });
      });
    });

    it('should create a distribution with mentions to non members who are not allowed in the room', function() {
      mockito
        .when(createPolicyForUserIdInRoom)(userId3, troupe)
        .thenReturn(
          Promise.resolve({
            canJoin: function() {
              return false;
            }
          })
        );

      return createDistribution(fromUserId, troupe, [{ userId: userId3 }]).then(function(result) {
        assert.deepEqual(result.options, {
          announcement: false,
          membersWithFlags: [
            {
              flags: 1,
              userId: userId1
            },
            {
              flags: 2,
              userId: userId2
            }
          ],
          mentions: [],
          nonMemberMentions: [],
          presence: {
            troupeId: troupeId,
            userIds: [userId1, userId2]
          }
        });
      });
    });

    it('should create a distribution with mentions to non members who are not allowed on gitter', function() {
      mockito
        .when(createPolicyForUserIdInRoom)(userId3, troupe)
        .thenReturn(
          Promise.resolve({
            canJoin: function() {
              return false;
            }
          })
        );

      return createDistribution(fromUserId, troupe, [{ userId: userId3 }]).then(function(result) {
        assert.deepEqual(result.options, {
          announcement: false,
          membersWithFlags: [
            {
              flags: 1,
              userId: userId1
            },
            {
              flags: 2,
              userId: userId2
            }
          ],
          mentions: [],
          nonMemberMentions: [],
          presence: {
            troupeId: troupeId,
            userIds: [userId1, userId2]
          }
        });
      });
    });
  });

  describe('findNonMembersWithAccess', function() {
    var userService, createPolicyForUserIdInRoom, createDistribution;

    beforeEach(function() {
      userService = mockito.mock(require('gitter-web-users'));
      createPolicyForUserIdInRoom = mockito.mockFunction();

      createDistribution = proxyquireNoCallThru('../lib/create-distribution', {
        'gitter-web-users': userService,
        'gitter-web-permissions/lib/policy-factory': {
          createPolicyForUserIdInRoom: createPolicyForUserIdInRoom
        }
      });
    });

    it('should handle an empty array', function() {
      return createDistribution.testOnly
        .findNonMembersWithAccess({ sd: { public: true } }, [])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        });
    });

    it('should handle one to one rooms', function() {
      return createDistribution.testOnly
        .findNonMembersWithAccess({ oneToOne: true }, ['1', '2', '3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        });
    });

    it('should handle public rooms', function() {
      mockito
        .when(createPolicyForUserIdInRoom)()
        .then(function() {
          return Promise.resolve({
            canJoin: function() {
              return Promise.resolve(true);
            }
          });
        });

      return createDistribution.testOnly
        .findNonMembersWithAccess({ sd: { public: true } }, ['1', '2', '3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, ['1', '2', '3']);
        });
    });

    it('should handle org and inherited rooms', function() {
      var troupe = {
        sd: { public: false }
      };
      mockito
        .when(userService)
        .findByIds()
        .then(function(userIds) {
          assert.deepEqual(userIds, ['1', '2', '3']);
          return Promise.resolve(
            userIds.map(function(userId) {
              return {
                _id: userId,
                id: userId
              };
            })
          );
        });

      mockito
        .when(createPolicyForUserIdInRoom)()
        .then(function(userId, pTroupe) {
          assert(pTroupe === troupe);
          return Promise.resolve({
            canJoin: function() {
              return Promise.resolve(userId !== '3');
            }
          });
        });

      return createDistribution.testOnly
        .findNonMembersWithAccess(troupe, ['1', '2', '3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, ['1', '2']); // User three should not be in the list
        });
    });
  });
});
