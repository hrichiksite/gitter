'use strict';

var groupMembershipDeltaService = require('../lib/group-membership-delta-service');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('group-membership-delta-service', function() {
  describe('integration tests #slow', function() {
    describe('isUserInGroup', function() {
      var fixture = fixtureLoader.setup({
        group1: {},
        group2: {},
        user1: {},
        troupe1: { users: ['user1'], group: 'group1' },
        troupe2: { users: ['user1'] }
      });

      it('should report that a user is in a group', function() {
        return groupMembershipDeltaService
          .isUserInGroup(fixture.user1._id, fixture.group1._id)
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          });
      });

      it('should report that a user is not in a group, excluding a room', function() {
        return groupMembershipDeltaService
          .isUserInGroup(fixture.user1._id, fixture.group1._id, fixture.troupe1._id)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          });
      });

      it('should report that a user is not in a group', function() {
        return groupMembershipDeltaService
          .isUserInGroup(fixture.user1._id, fixture.group2._id)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          });
      });

      it('should report that a user is not in a group, excluding a room, when theyre not in the room', function() {
        return groupMembershipDeltaService
          .isUserInGroup(fixture.user1._id, fixture.group2._id, fixture.troupe1._id)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          });
      });
    });

    describe('checkUsersInGroup', function() {
      var fixture = fixtureLoader.setup({
        group1: {},
        group2: {},
        group3: {},
        user1: {},
        user2: {},
        troupe1: { users: ['user1'], group: 'group1' },
        troupe2: { users: ['user2'], group: 'group2' },
        troupe3: { users: ['user1', 'user2'], group: 'group3' }
      });

      it('test #1', function() {
        return groupMembershipDeltaService
          .checkUsersInGroup(fixture.group1._id, [fixture.user1._id, fixture.user2._id])
          .then(function(hash) {
            var expected = {};
            expected[fixture.user1._id] = true;
            assert.deepEqual(hash, expected);
          });
      });

      it('test #2', function() {
        return groupMembershipDeltaService
          .checkUsersInGroup(
            fixture.group1._id,
            [fixture.user1._id, fixture.user2._id],
            fixture.troupe1._id
          )
          .then(function(hash) {
            assert.deepEqual(hash, {});
          });
      });

      it('test #3', function() {
        return groupMembershipDeltaService
          .checkUsersInGroup(fixture.group2._id, [fixture.user1._id, fixture.user2._id])
          .then(function(hash) {
            var expected = {};
            expected[fixture.user2._id] = true;
            assert.deepEqual(hash, expected);
          });
      });

      it('test #4 - two users', function() {
        return groupMembershipDeltaService
          .checkUsersInGroup(fixture.group3._id, [fixture.user1._id, fixture.user2._id])
          .then(function(hash) {
            var expected = {};
            expected[fixture.user1._id] = true;
            expected[fixture.user2._id] = true;

            assert.deepEqual(hash, expected);
          });
      });

      it('test #4 - two users, excluding room', function() {
        return groupMembershipDeltaService
          .checkUsersInGroup(
            fixture.group3._id,
            [fixture.user1._id, fixture.user2._id],
            fixture.troupe3._id
          )
          .then(function(hash) {
            var expected = {};
            assert.deepEqual(hash, expected);
          });
      });
    });
  });
});
