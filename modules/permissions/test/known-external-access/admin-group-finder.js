'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('admin-finder', function() {
  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    var URI = fixtureLoader.generateUri();
    var URI2 = fixtureLoader.generateUri();
    var adminGroupFinder = require('../../lib/known-external-access/admin-group-finder');
    var recorder = require('../../lib/known-external-access/recorder');

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      group1: {
        securityDescriptor: {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: URI,
          externalId: 'external3',
          extraAdmins: ['user1']
        }
      },
      group2: {
        securityDescriptor: {
          type: 'GH_REPO',
          members: 'PUBLIC',
          admins: 'GH_REPO_PUSH',
          public: true,
          linkPath: URI2,
          externalId: null
        }
      }
    });

    it('should return known GH_ORG positive values', function() {
      var userId1 = fixture.user1._id;

      return recorder.testOnly
        .handle(userId1, 'GH_ORG', 'GH_ORG_MEMBER', URI, 'external3', true)
        .delay(100) // Give mongo time to write to secondary...
        .then(function() {
          return adminGroupFinder.findAdminGroupsOfTypeForUserId('GH_ORG', userId1);
        })
        .then(function(groups) {
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), fixture.group1.id);
        });
    });

    it('should not return known GH_ORG negative values', function() {
      var userId1 = fixture.user1._id;

      return recorder.testOnly
        .handle(userId1, 'GH_ORG', 'GH_ORG_MEMBER', URI, 'external3', false)
        .delay(100) // Give mongo time to write to secondary...
        .then(function() {
          return adminGroupFinder.findAdminGroupsOfTypeForUserId('GH_ORG', userId1);
        })
        .then(function(groups) {
          assert.deepEqual(groups, []);
        });
    });

    it('should return known GH_REPO positive values', function() {
      var userId1 = fixture.user1._id;

      return recorder.testOnly
        .handle(userId1, 'GH_REPO', 'GH_REPO_PUSH', URI2, 'external4', true)
        .delay(100) // Give mongo time to write to secondary...
        .then(function() {
          return adminGroupFinder.findAdminGroupsOfTypeForUserId('GH_REPO', userId1);
        })
        .then(function(groups) {
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), fixture.group2.id);
        });
    });

    it('should not return known GH_REPO negative values', function() {
      var userId1 = fixture.user1._id;

      return recorder.testOnly
        .handle(userId1, 'GH_REPO', 'GH_REPO_PUSH', URI2, 'external4', false)
        .delay(100) // Give mongo time to write to secondary...
        .then(function() {
          return adminGroupFinder.findAdminGroupsOfTypeForUserId('GH_REPO', userId1);
        })
        .then(function(groups) {
          assert.deepEqual(groups, []);
        });
    });
  });
});
