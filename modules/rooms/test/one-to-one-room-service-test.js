'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var _ = require('lodash');
var assert = require('assert');
var StatusError = require('statuserror');
var oneToOneRoomService = require('../lib/one-to-one-room-service');
var roomMembershipService = require('../lib/room-membership-service');

function findUserIdPredicate(userId) {
  return function(x) {
    return '' + x === '' + userId;
  };
}
describe('one-to-one-room-service', function() {
  describe('#slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      userRemoved: {
        state: 'REMOVED'
      }
    });

    it('should handle the creation of a oneToOneTroupe single', function() {
      return oneToOneRoomService
        .findOrCreateOneToOneRoom(fixture.user1, fixture.user2.id)
        .spread(function(troupe, otherUser) {
          assert(troupe);
          assert(troupe.oneToOne);
          assert.strictEqual(troupe.githubType, 'ONETOONE');
          assert.strictEqual(otherUser.id, fixture.user2.id);
          assert.strictEqual(troupe.oneToOneUsers.length, 2);

          return roomMembershipService.findMembersForRoom(troupe.id);
        })
        .then(function(userIds) {
          assert(_.find(userIds, findUserIdPredicate(fixture.user1.id)));
          assert(_.find(userIds, findUserIdPredicate(fixture.user2.id)));
        });
    });

    it('should handle the creation of a oneToOneTroupe atomicly', function() {
      return Promise.all([
        oneToOneRoomService.findOrCreateOneToOneRoom(fixture.user2, fixture.user3.id),
        oneToOneRoomService.findOrCreateOneToOneRoom(fixture.user3, fixture.user2.id)
      ])
        .spread(function(r1, r2) {
          var troupe1 = r1[0];
          var otherUser1 = r1[1];
          var troupe2 = r2[0];
          var otherUser2 = r2[1];

          assert(troupe1);
          assert(troupe1.oneToOne);
          assert.strictEqual(troupe1.githubType, 'ONETOONE');
          assert.strictEqual(troupe1.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser1.id, fixture.user3.id);

          assert(troupe2);
          assert(troupe2.oneToOne);
          assert.strictEqual(troupe2.githubType, 'ONETOONE');
          assert.strictEqual(troupe2.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser2.id, fixture.user2.id);

          assert.strictEqual(troupe1.id, troupe2.id);

          return roomMembershipService.findMembersForRoom(troupe1.id);
        })
        .then(function(userIds) {
          assert(_.find(userIds, findUserIdPredicate(fixture.user2.id)));
          assert(_.find(userIds, findUserIdPredicate(fixture.user3.id)));
        });
    });

    it('should handle the creation of a oneToOneTroupe atomicly', function() {
      return Promise.all([
        oneToOneRoomService.findOrCreateOneToOneRoom(fixture.user2, fixture.user3.id),
        oneToOneRoomService.findOrCreateOneToOneRoom(fixture.user3, fixture.user2.id)
      ])
        .spread(function(r1, r2) {
          var troupe1 = r1[0];
          var otherUser1 = r1[1];
          var troupe2 = r2[0];
          var otherUser2 = r2[1];

          assert(troupe1);
          assert(troupe1.oneToOne);
          assert.strictEqual(troupe1.githubType, 'ONETOONE');
          assert.strictEqual(troupe1.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser1.id, fixture.user3.id);

          assert(troupe2);
          assert(troupe2.oneToOne);
          assert.strictEqual(troupe2.githubType, 'ONETOONE');
          assert.strictEqual(troupe2.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser2.id, fixture.user2.id);

          assert.strictEqual(troupe1.id, troupe2.id);

          return roomMembershipService.findMembersForRoom(troupe1.id);
        })
        .then(function(userIds) {
          assert(_.find(userIds, findUserIdPredicate(fixture.user2.id)));
          assert(_.find(userIds, findUserIdPredicate(fixture.user3.id)));
        });
    });

    it('should not allow a user to create a room with a REMOVED user', function() {
      var userId2 = fixture.userRemoved._id;

      return oneToOneRoomService
        .findOrCreateOneToOneRoom(fixture.user1, userId2)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert(err.status, 403);
        });
    });
  });

  describe('https://github.com/troupe/gitter-webapp/issues/1227 #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {}
    });

    it("should add the requesting user back into a one-to-one room if they've been removed", function() {
      var user1 = fixture.user1;
      var userId1 = user1._id;
      var userId2 = fixture.user2._id;

      return oneToOneRoomService
        .findOrCreateOneToOneRoom(user1, userId2)
        .bind({ room: undefined })
        .spread(function(room) {
          this.room = room;
          return roomMembershipService.removeRoomMember(room._id, userId1);
        })
        .then(function() {
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 1);
          assert.strictEqual(String(members[0]), String(userId2));

          return oneToOneRoomService.findOrCreateOneToOneRoom(user1, userId2);
        })
        .spread(function(room) {
          assert.strictEqual(room.id, this.room.id);
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 2);
          assert(
            members.some(function(x) {
              return String(x) === String(userId1);
            })
          );
          assert(
            members.some(function(x) {
              return String(x) === String(userId2);
            })
          );
        });
    });

    it("should add the users back into a one-to-one room if they've both been removed", function() {
      var user1 = fixture.user1;
      var userId1 = user1._id;
      var userId2 = fixture.user2._id;

      return oneToOneRoomService
        .findOrCreateOneToOneRoom(user1, userId2)
        .bind({ room: undefined })
        .spread(function(room) {
          this.room = room;
          return Promise.join(
            roomMembershipService.removeRoomMember(room._id, userId1),
            roomMembershipService.removeRoomMember(room._id, userId2)
          );
        })
        .then(function() {
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 0);

          return oneToOneRoomService.findOrCreateOneToOneRoom(user1, userId2);
        })
        .spread(function(room) {
          assert.strictEqual(room.id, this.room.id);
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 2);
          var actual = members.map(String);
          actual.sort();
          var expected = [userId1, userId2].map(String);
          expected.sort();
          assert.deepEqual(actual, expected);
        });
    });

    it('should add the users back into a one-to-one room if the fromUser has been removed', function() {
      var user1 = fixture.user1;
      var userId1 = user1._id;
      var userId2 = fixture.user2._id;

      return oneToOneRoomService
        .findOrCreateOneToOneRoom(user1, userId2)
        .bind({ room: undefined })
        .spread(function(room) {
          this.room = room;
          return roomMembershipService.removeRoomMember(room._id, userId1);
        })
        .then(function() {
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 1);

          return oneToOneRoomService.findOrCreateOneToOneRoom(user1, userId2);
        })
        .spread(function(room) {
          assert.strictEqual(room.id, this.room.id);
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 2);
          var actual = members.map(String);
          actual.sort();
          var expected = [userId1, userId2].map(String);
          expected.sort();
          assert.deepEqual(actual, expected);
        });
    });

    it('should add the users back into a one-to-one room if the toUser has been removed', function() {
      var user1 = fixture.user1;
      var userId1 = user1._id;
      var userId2 = fixture.user2._id;

      return oneToOneRoomService
        .findOrCreateOneToOneRoom(user1, userId2)
        .bind({ room: undefined })
        .spread(function(room) {
          this.room = room;
          return roomMembershipService.removeRoomMember(room._id, userId2);
        })
        .then(function() {
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 1);

          return oneToOneRoomService.findOrCreateOneToOneRoom(user1, userId2);
        })
        .spread(function(room) {
          assert.strictEqual(room.id, this.room.id);
          return roomMembershipService.findMembersForRoom(this.room._id);
        })
        .then(function(members) {
          assert.strictEqual(members.length, 2);
          var actual = members.map(String);
          actual.sort();
          var expected = [userId1, userId2].map(String);
          expected.sort();
          assert.deepEqual(actual, expected);
        });
    });
  });
});
