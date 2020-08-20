'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var ObjectID = require('mongodb').ObjectID;
var recentRoomCore = require('../lib/recent-room-core');

describe('recent-room-core', function() {
  describe('findLastAccessTimesForUsersInRoom #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      troupe1: { users: ['user1'] }
    });

    it('should handle default values', function() {
      return recentRoomCore
        .findLastAccessTimesForUsersInRoom(fixture.troupe1.id, [
          fixture.user1.id,
          fixture.user2._id
        ])
        .then(function(result) {
          assert(result[fixture.user1.id]);
          assert(result[fixture.user2.id]);
        });
    });

    it('should handle non default values', function() {
      return Promise.all([
        recentRoomCore.saveUserTroupeLastAccess(fixture.user1.id, fixture.troupe1.id),
        recentRoomCore.saveUserTroupeLastAccess(fixture.user2.id, fixture.troupe1.id)
      ])
        .then(function() {
          return recentRoomCore.findLastAccessTimesForUsersInRoom(fixture.troupe1.id, [
            fixture.user1.id,
            fixture.user2._id
          ]);
        })
        .then(function(result) {
          var d1 = Date.now() - result[fixture.user1.id];
          var d2 = Date.now() - result[fixture.user2.id];
          assert(d1 >= 0);
          assert(d1 < 5000);

          assert(d2 >= 0);
          assert(d2 < 5000);
        });
    });
  });

  describe('saveUserTroupeLastAccess #slow', function() {
    it('should update on insert', function() {
      var userId = new ObjectID();
      var troupeId = new ObjectID();
      return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId).then(function(didUpdate) {
        assert.strictEqual(didUpdate, true);
      });
    });

    it('should update on update', function() {
      var userId = new ObjectID();
      var troupeId = new ObjectID();
      var troupeId2 = new ObjectID();
      return recentRoomCore
        .saveUserTroupeLastAccess(userId, troupeId)
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, true);
          return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId2);
        })
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, true);
        });
    });

    it('should not update when the date is equal', function() {
      var userId = new ObjectID();
      var troupeId = new ObjectID();
      var lastAccessTime = new Date();
      var lastAccessTimeOld = new Date(lastAccessTime - 1000);

      return recentRoomCore
        .saveUserTroupeLastAccess(userId, troupeId, lastAccessTime)
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, true);
          return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId, lastAccessTimeOld);
        })
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, false);
        });
    });
  });
});
