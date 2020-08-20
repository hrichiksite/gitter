'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var policyFactory = require('../lib/policy-factory');

describe('policy-factory', function() {
  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      user4: {},
      user5: {},
      group1: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          linkPath: null,
          externalId: null,
          extraAdmins: ['user1', 'user5']
        }
      },
      troupe1: {
        users: ['user1'],
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          linkPath: null,
          externalId: null,
          extraMembers: ['user1'],
          extraAdmins: ['user1', 'user3']
        }
      },
      troupe2: {
        users: ['user1'],
        securityDescriptor: {
          type: null,
          members: 'INVITE',
          admins: 'MANUAL',
          public: false,
          linkPath: null,
          externalId: null,
          extraMembers: [],
          extraAdmins: []
        }
      },
      troupe3: {
        users: ['user5'],
        securityDescriptor: {
          type: 'GROUP',
          members: 'PUBLIC',
          admins: 'GROUP_ADMIN',
          public: true,
          linkPath: null,
          internalId: 'group1',
          externalId: null,
          extraMembers: [],
          extraAdmins: ['user3']
        }
      },
      troupe4: {
        users: ['user4'],
        securityDescriptor: {
          type: 'GROUP',
          members: 'INVITE',
          admins: 'GROUP_ADMIN',
          public: false,
          linkPath: null,
          internalId: 'group1',
          externalId: null,
          extraMembers: [],
          extraAdmins: ['user3']
        }
      }
    });

    describe('createPolicyForRoomId', function() {
      function checkPolicyForRoom(user, room, expected) {
        var roomId = room._id;

        return policyFactory
          .createPolicyForRoomId(user, roomId)
          .then(function(policy) {
            return Promise.props({
              canRead: policy.canRead(),
              canJoin: policy.canJoin(),
              canAdmin: policy.canAdmin(),
              canAddUser: policy.canAddUser()
            });
          })
          .then(function(results) {
            assert.deepEqual(results, expected);
          });
      }

      it('public room member, admin', function() {
        return checkPolicyForRoom(fixture.user1, fixture.troupe1, {
          canRead: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

      it('public room not member, not admin', function() {
        return checkPolicyForRoom(fixture.user2, fixture.troupe1, {
          canRead: true,
          canJoin: true,
          canAdmin: false,
          canAddUser: true
        });
      });

      it('invite room is member, not admin', function() {
        return checkPolicyForRoom(fixture.user1, fixture.troupe2, {
          canRead: true,
          canJoin: true,
          canAdmin: false,
          canAddUser: true
        });
      });

      it('invite room not member, not admin', function() {
        return checkPolicyForRoom(fixture.user2, fixture.troupe2, {
          canRead: false,
          canJoin: false,
          canAdmin: false,
          canAddUser: false
        });
      });

      it('invite room not member, is admin', function() {
        return checkPolicyForRoom(fixture.user3, fixture.troupe1, {
          canRead: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

      describe('group backed rooms', function() {
        describe('public', function() {
          it('group admin is admin of a group-backed room', function() {
            return checkPolicyForRoom(fixture.user1, fixture.troupe3, {
              canRead: true,
              canJoin: true,
              canAdmin: true,
              canAddUser: true
            });
          });

          it('non group admin is not admin of a group-backed room', function() {
            return checkPolicyForRoom(fixture.user2, fixture.troupe3, {
              canRead: true,
              canJoin: true,
              canAdmin: false,
              canAddUser: true
            });
          });

          it('extraAdmin user is room admin even though they are not a group admin', function() {
            return checkPolicyForRoom(fixture.user3, fixture.troupe3, {
              canRead: true,
              canJoin: true,
              canAdmin: true,
              canAddUser: true
            });
          });
        });
      });

      describe('invite-only', function() {
        it('group admin is not admin of a group-backed room if they are not in the room', function() {
          return checkPolicyForRoom(fixture.user1, fixture.troupe4, {
            canRead: false,
            canJoin: false,
            canAdmin: false,
            canAddUser: false
          });
        });

        it('group admin is admin of a group-backed room if they are in the room', function() {
          return checkPolicyForRoom(fixture.user5, fixture.troupe3, {
            canRead: true,
            canJoin: true,
            canAdmin: true,
            canAddUser: true
          });
        });

        it('non group admin is not admin of a group-backed room', function() {
          return checkPolicyForRoom(fixture.user2, fixture.troupe4, {
            canRead: false,
            canJoin: false,
            canAdmin: false,
            canAddUser: false
          });
        });

        it('extraAdmin user is room admin even though they are not a group admin', function() {
          return checkPolicyForRoom(fixture.user3, fixture.troupe4, {
            canRead: true,
            canJoin: true,
            canAdmin: true,
            canAddUser: true
          });
        });

        it('invite user has non admin privs', function() {
          return checkPolicyForRoom(fixture.user4, fixture.troupe4, {
            canRead: true,
            canJoin: true,
            canAdmin: false,
            canAddUser: true
          });
        });
      });
    });

    describe('createPolicyForGroupId', function() {
      function checkPolicyForGroup(user, group, expected) {
        var groupId = group._id;

        return policyFactory
          .createPolicyForGroupId(user, groupId)
          .then(function(policy) {
            return Promise.props({
              canRead: policy.canRead(),
              canWrite: policy.canWrite(),
              canJoin: policy.canJoin(),
              canAdmin: policy.canAdmin(),
              canAddUser: policy.canAddUser()
            });
          })
          .then(function(results) {
            assert.deepEqual(results, expected);
          });
      }

      it('public group non-member', function() {
        return checkPolicyForGroup(fixture.user2, fixture.group1, {
          canRead: true,
          canWrite: true,
          canJoin: true,
          canAdmin: false,
          canAddUser: true
        });
      });

      it('public group member (via room membership)', function() {
        return checkPolicyForGroup(fixture.user3, fixture.group1, {
          canRead: true,
          canWrite: true,
          canJoin: true,
          canAdmin: false,
          canAddUser: true
        });
      });

      it('public group admin (via extra-admins)', function() {
        return checkPolicyForGroup(fixture.user1, fixture.group1, {
          canRead: true,
          canWrite: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });
    });

    // TODO
    //createPolicyForGroupIdWithUserLoader
    //getPreCreationPolicyEvaluator
    //getPreCreationPolicyEvaluatorWithRepoFallback
  });
});
