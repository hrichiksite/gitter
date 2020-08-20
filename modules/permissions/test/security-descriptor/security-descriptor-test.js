'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var securityDescriptorService = require('../../lib/security-descriptor');

describe('data-access-test', function() {
  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      group1: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          extraMembers: ['user1'],
          extraAdmins: ['user2']
        }
      },
      group2: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true
        }
      },
      group3: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true
        }
      },
      group4: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          extraAdmins: ['user1']
        }
      }
    });

    describe('findByIdForModel', function() {
      it('should findById without a user', function() {
        var groupId1 = fixture.group1.id;
        return securityDescriptorService.group.findById(groupId1).then(function(sd) {
          assert.strictEqual(sd.type, null);
          assert.strictEqual(sd.members, 'PUBLIC');
          assert.strictEqual(sd.admins, 'MANUAL');
          assert.strictEqual(sd.public, true);
        });
      });

      it('should findById with a user', function() {
        var groupId1 = fixture.group1.id;
        var userId1 = fixture.user1.id;
        return securityDescriptorService.group.findById(groupId1, userId1).then(function(sd) {
          assert.strictEqual(sd.type, null);
          assert.strictEqual(sd.members, 'PUBLIC');
          assert.strictEqual(sd.admins, 'MANUAL');
          assert.strictEqual(sd.public, true);
        });
      });
    });

    describe('findExtraAdminsForModel', function() {
      it('should find extra admins when there are', function() {
        var groupId1 = fixture.group1.id;
        return securityDescriptorService.group
          .findExtraAdmins(groupId1)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), [fixture.user2.id]);
          });
      });

      it('should not find extra admins when there are none', function() {
        var groupId2 = fixture.group2.id;
        return securityDescriptorService.group
          .findExtraAdmins(groupId2)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), []);
          });
      });
    });

    describe('findExtraMembersForModel', function() {
      it('should find extra admins when there are', function() {
        var groupId1 = fixture.group1.id;
        return securityDescriptorService.group
          .findExtraMembers(groupId1)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), [fixture.user1.id]);
          });
      });

      it('should not find extra admins when there are none', function() {
        var groupId2 = fixture.group2.id;
        return securityDescriptorService.group
          .findExtraMembers(groupId2)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), []);
          });
      });
    });

    describe('addExtraAdminForModel', function() {
      it('should add a user not in extraAdmins', function() {
        var groupId3 = fixture.group3.id;
        var userId1 = fixture.user1.id;
        return securityDescriptorService.group
          .addExtraAdmin(groupId3, userId1)
          .then(function(modified) {
            assert.strictEqual(modified, true);
            return securityDescriptorService.group.findExtraAdmins(groupId3);
          })
          .then(function(userIds) {
            assert(
              userIds.some(function(userId) {
                return String(userId) === String(userId1);
              })
            );

            return securityDescriptorService.group.addExtraAdmin(groupId3, userId1);
          })
          .then(function(modified) {
            assert.strictEqual(modified, false);
          });
      });
    });

    describe('removeExtraAdmin', function() {
      it('should remove a user in extraAdmins', function() {
        var groupId4 = fixture.group4.id;
        var userId1 = fixture.user1.id;
        return securityDescriptorService.group
          .removeExtraAdmin(groupId4, userId1)
          .then(function(modified) {
            assert.strictEqual(modified, true);
            return securityDescriptorService.group.findExtraAdmins(groupId4);
          })
          .then(function(userIds) {
            assert(
              !userIds.some(function(userId) {
                return String(userId) === String(userId1);
              })
            );

            return securityDescriptorService.group.removeExtraAdmin(groupId4, userId1);
          })
          .then(function(modified) {
            assert.strictEqual(modified, false);
          });
      });
    });

    describe('findByIdsSelect', function() {
      it('should return multiple values', function() {
        var groupId1 = fixture.group1.id;
        var groupId2 = fixture.group2.id;
        var groupId4 = fixture.group4.id;

        return securityDescriptorService.group
          .findByIdsSelect([groupId1, groupId2, groupId4], { linkPath: 1, type: 1 })
          .then(function(results) {
            results.forEach(function(x) {
              x._id = String(x._id);
            });

            assert.deepEqual(results, [
              {
                _id: groupId1,
                sd: {
                  type: null
                }
              },
              {
                _id: groupId2,
                sd: {
                  type: null
                }
              },
              {
                _id: groupId4,
                sd: {
                  type: null
                }
              }
            ]);
          });
      });
    });
  });
});
