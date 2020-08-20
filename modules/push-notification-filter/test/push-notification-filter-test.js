'use strict';

var assert = require('assert');

describe('push-notification-filter', function() {
  var pushNotificationFilter;

  before(function() {
    pushNotificationFilter = require('..');
  });

  describe('findUsersInRoomAcceptingNotifications', function() {
    it('should not filter users who have received no notifications', function() {
      var userId1 = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();

      return pushNotificationFilter
        .findUsersInRoomAcceptingNotifications(troupeId, [userId1])
        .then(function(result) {
          assert.deepEqual(result, [userId1]); // Notify
        });
    });

    it('should filter users who have received notifications', function() {
      var userId1 = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();
      var MAX_LOCK_VALUE = 2;
      var startTime1 = Date.now();
      var startTime2;

      return pushNotificationFilter
        .findUsersInRoomAcceptingNotifications(troupeId, [userId1])
        .then(function(result) {
          assert.deepEqual(result, [userId1]); // Notify
        })
        .then(function() {
          return pushNotificationFilter.canLockForNotification(
            userId1,
            troupeId,
            startTime1,
            MAX_LOCK_VALUE
          );
        })
        .then(function(locked) {
          assert.equal(locked, 1);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, []); // Do not notify
          // First notification
          return pushNotificationFilter.canUnlockForNotification(userId1, troupeId, 1);
        })
        .then(function(startTime) {
          assert.strictEqual(startTime1, startTime);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, [userId1]); // Notify
          // Second notification
          startTime2 = Date.now();
          return pushNotificationFilter.canLockForNotification(
            userId1,
            troupeId,
            Date.now(),
            MAX_LOCK_VALUE
          );
        })
        .then(function(locked) {
          assert.equal(locked, 2);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, []); // Do not notify
          return pushNotificationFilter.canUnlockForNotification(userId1, troupeId, 2);
        })
        .then(function(startTime) {
          assert.strictEqual(startTime2, startTime);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, [userId1]);
        });
    });
  });

  describe('Notification Locking', function() {
    it('should lock user troupe pairs so that users dont get too many notifications', function() {
      var userId = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();
      var startTime = Date.now();
      var MAX_LOCK_VALUE = 2;
      var MAX_LOCK_VALUE_MENTIONS = 3;

      return pushNotificationFilter
        .canLockForNotification(userId, troupeId, startTime, MAX_LOCK_VALUE)
        .then(function(locked) {
          assert.equal(locked, 1);
          return pushNotificationFilter.canLockForNotification(
            userId,
            troupeId,
            startTime,
            MAX_LOCK_VALUE
          );
        })
        .then(function(locked) {
          assert.equal(locked, 0);

          return pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1);
        })
        .then(function(st) {
          assert.equal(st, startTime);

          return pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1);
        })
        .then(function(st) {
          assert.equal(st, 0);
          return pushNotificationFilter.canLockForNotification(
            userId,
            troupeId,
            startTime,
            MAX_LOCK_VALUE
          );
        })
        .then(function(locked) {
          assert.equal(locked, 2);

          return pushNotificationFilter.canUnlockForNotification(userId, troupeId, 2);
        })
        .then(function(st) {
          assert.equal(st, startTime);
          startTime = Date.now();

          return pushNotificationFilter.canLockForNotification(
            userId,
            troupeId,
            startTime,
            MAX_LOCK_VALUE
          );
        })
        .then(function(locked) {
          assert.equal(locked, 0);
          return pushNotificationFilter.canLockForNotification(
            userId,
            troupeId,
            startTime,
            MAX_LOCK_VALUE_MENTIONS
          );
        })
        .then(function(locked) {
          assert.equal(locked, 3);
          return pushNotificationFilter.canUnlockForNotification(userId, troupeId, 3);
        })
        .then(function(st) {
          assert.equal(st, startTime);
        });
    });

    it('should handle notification resets', function() {
      var userId = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();
      var startTime = Date.now();
      var MAX_LOCK_VALUE = 2;

      return pushNotificationFilter
        .resetNotificationsForUserTroupe(userId, troupeId)
        .then(function() {
          return pushNotificationFilter.canLockForNotification(
            userId,
            troupeId,
            startTime,
            MAX_LOCK_VALUE
          );
        })
        .then(function(locked) {
          assert.equal(locked, 1);

          return pushNotificationFilter.resetNotificationsForUserTroupe(userId, troupeId);
        })
        .then(function() {
          return pushNotificationFilter.canLockForNotification(
            userId,
            troupeId,
            startTime,
            MAX_LOCK_VALUE
          );
        })
        .then(function(locked) {
          assert.equal(locked, 1);

          return pushNotificationFilter.resetNotificationsForUserTroupe(userId, troupeId);
        })
        .then(function() {
          return pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1);
        })
        .then(function(st) {
          assert.equal(st, 0);
        });
    });
  });

  it('should set the expiry correctly on the redis keys', function() {
    var userId = 'TEST_USER1_' + Date.now();
    var troupeId = 'TEST_TROUPE1_' + Date.now();
    var startTime = Date.now();
    var MAX_LOCK_VALUE = 2;

    var t1;
    return pushNotificationFilter
      .canLockForNotification(userId, troupeId, startTime, MAX_LOCK_VALUE)
      .then(function() {
        return [
          pushNotificationFilter.testOnly.redisClient.pttl('nl:' + userId + ':' + troupeId),
          pushNotificationFilter.testOnly.redisClient.pttl('nls:' + userId + ':' + troupeId)
        ];
      })
      .spread(function(ttl1, ttl2) {
        assert(ttl1 > 0);
        assert(ttl2 > 0);
        t1 = ttl1;

        return pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1);
      })
      .then(function() {
        return [
          pushNotificationFilter.testOnly.redisClient.pttl('nl:' + userId + ':' + troupeId),
          pushNotificationFilter.testOnly.redisClient.exists('nls:' + userId + ':' + troupeId)
        ];
      })

      .spread(function(ttl1, exists) {
        assert(ttl1 > 0);
        assert(ttl1 < t1); // Check that the expiry on the key has not been reset.

        assert.strictEqual(exists, 0);

        return pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1);
      });
  });
});
