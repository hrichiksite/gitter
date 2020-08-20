'use strict';

var groupMembershipService = require('../lib/group-membership-service');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('group-membership-service', function() {
  function findGroup(groups, groupId) {
    return groups.filter(function(f) {
      return mongoUtils.objectIDsEqual(f._id, groupId);
    })[0];
  }

  function assertGroupEqual(actual, expected) {
    if ((expected && !actual) || (actual && !expected)) {
      // This will generate an assert failure
      assert.deepEqual(actual, expected);
    }

    assert.strictEqual(String(actual._id), String(expected._id));
    assert.strictEqual(actual.uri, expected.uri);
    assert.strictEqual(actual.lcUri, expected.lcUri);
    assert.strictEqual(actual.name, expected.name);
  }

  describe('integration tests #slow', function() {
    fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USER_SCOPE_TOKEN');

    var fixture = fixtureLoader.setup({
      group1: {},
      group2: {
        securityDescriptor: {
          extraAdmins: ['user2']
        }
      },
      group3: {},
      user1: {
        githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
      },
      user2: {
        githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
      },
      user3: {
        githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
      },
      troupe1: { users: ['user1', 'user2'], group: 'group1' },
      troupe2: { users: ['user2'], group: 'group2' },
      troupe3: { users: ['user1'], group: 'group3' },
      troupe4: { users: ['user1', 'user3'] }
    });

    describe('findGroupsForUser', function() {
      it('should return all the groups for a user, 1', function() {
        return groupMembershipService.findGroupsForUser(fixture.user1._id).then(function(groups) {
          assert.strictEqual(groups.length, 2);
          var g1 = findGroup(groups, fixture.group1._id);
          var g2 = findGroup(groups, fixture.group3._id);
          assertGroupEqual(g1, fixture.group1);
          assertGroupEqual(g2, fixture.group3);
        });
      });

      it('should return all the groups for a user, 2', function() {
        return groupMembershipService.findGroupsForUser(fixture.user2._id).then(function(groups) {
          assert.strictEqual(groups.length, 2);
          var g1 = findGroup(groups, fixture.group1._id);
          var g2 = findGroup(groups, fixture.group2._id);

          assertGroupEqual(g1, fixture.group1);
          assertGroupEqual(g2, fixture.group2);
        });
      });

      it('should return all the groups for a user without groups', function() {
        return groupMembershipService.findGroupsForUser(fixture.user3._id).then(function(groups) {
          assert.strictEqual(groups.length, 0);
        });
      });
    });

    describe('findAdminGroupsForUser', function() {
      it('should return all the groups for a user, 1', function() {
        return groupMembershipService.findAdminGroupsForUser(fixture.user1).then(function(groups) {
          assert.deepEqual(groups, []);
        });
      });

      it('should return all the groups for a user, 2', function() {
        return groupMembershipService.findAdminGroupsForUser(fixture.user2).then(function(groups) {
          assert.strictEqual(groups.length, 1);
          var g2 = findGroup(groups, fixture.group2._id);
          assertGroupEqual(g2, fixture.group2);
        });
      });

      it('should return all the groups for a user without groups', function() {
        return groupMembershipService.findAdminGroupsForUser(fixture.user3).then(function(groups) {
          assert.deepEqual(groups, []);
        });
      });
    });
  });
});
