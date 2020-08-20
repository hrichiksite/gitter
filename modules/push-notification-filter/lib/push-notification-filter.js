'use strict';

var fs = require('fs');
var path = require('path');
var env = require('gitter-web-env');
var config = env.config;
var debug = require('debug')('gitter:app:push-notification-filter');
var redisClient = env.ioredis.createClient(null);

var minimumUserAlertIntervalS = config.get('notifications:minimumUserAlertInterval');

var MAX_NOTIFICATIONS_PER_CYCLE = 100;

function defineCommand(name, script, keys) {
  redisClient.defineCommand(name, {
    lua: fs.readFileSync(path.join(__dirname, '..', 'redis-lua', script + '.lua')),
    numberOfKeys: keys
  });
}

defineCommand('notifyLockUserTroupe', 'notify-lock-user-troupe', 2);
defineCommand('notifyUnlockUserTroupe', 'notify-unlock-user-troupe', 2);

function findUsersInRoomAcceptingNotifications(troupeId, userIds) {
  var pipeline = redisClient.pipeline();
  userIds.forEach(function(userId) {
    pipeline.get('nl:' + userId + ':' + troupeId); // notification 1 sent
    pipeline.exists('nls:' + userId + ':' + troupeId); // awaiting timeout before sending note2
  });

  return pipeline.exec().then(function(replies) {
    var response = userIds.filter(function(userId, i) {
      var r1 = replies[i * 2];
      var r2 = replies[i * 2 + 1];

      if (r1[0]) throw r1[0]; // Check for error
      if (r2[0]) throw r2[0]; // Check for error

      var globalLockCount = r1[1];
      var segmentLockExists = r2[1];

      if (segmentLockExists) {
        /* We're already queueing messages for this user... */
        return false;
      } else {
        if (!globalLockCount) {
          /* User has not been sent any notifications */
          return true;
        }

        var intGlobalLockCount = parseInt(globalLockCount, 10) || 0;
        /*
         * Queue a notification for the user if they have not received > maxNotificationCount
         * notifications during the notification cycle period
         */
        return intGlobalLockCount < MAX_NOTIFICATIONS_PER_CYCLE;
      }
    });

    debug(
      'findUsersInRoomAcceptingNotifications filtered %s users down to %s',
      userIds.length,
      response.length
    );

    return response;
  });
}

function resetNotificationsForUserTroupe(userId, troupeId, callback) {
  debug('resetNotificationsForUserTroupe: userId=%s, troupeId=%s', userId, troupeId);

  return redisClient
    .del('nl:' + userId + ':' + troupeId, 'nls:' + userId + ':' + troupeId)
    .nodeify(callback);
}

// Returns falsey value or notification period number
function canLockForNotification(userId, troupeId, startTime, maxLockValue) {
  debug(
    'canLockForNotification: userId=%s, troupeId=%s, startTime=%s, maxLockValue=%s',
    userId,
    troupeId,
    startTime,
    maxLockValue
  );
  return redisClient.notifyLockUserTroupe(
    /* keys */ 'nl:' + userId + ':' + troupeId,
    'nls:' + userId + ':' + troupeId,
    /* values */ startTime,
    minimumUserAlertIntervalS,
    maxLockValue
  );
}

// Returns falsey value or start-of-notification-period as unix timestamp
function canUnlockForNotification(userId, troupeId, notificationNumber) {
  debug(
    'canUnlockForNotification: userId=%s, troupeId=%s, notificationNumber=%s',
    userId,
    troupeId,
    notificationNumber
  );
  return redisClient
    .notifyUnlockUserTroupe(
      /* keys */ 'nl:' + userId + ':' + troupeId,
      'nls:' + userId + ':' + troupeId,
      /* values */ notificationNumber
    )
    .then(function(result) {
      return result ? parseInt(result, 10) : 0;
    });
}

/* Exports */
exports.findUsersInRoomAcceptingNotifications = findUsersInRoomAcceptingNotifications;
exports.resetNotificationsForUserTroupe = resetNotificationsForUserTroupe;
exports.canLockForNotification = canLockForNotification;
exports.canUnlockForNotification = canUnlockForNotification;

exports.testOnly = {
  redisClient: redisClient
};
