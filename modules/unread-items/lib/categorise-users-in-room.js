'use strict';

var Promise = require('bluebird');
var presenceService = require('gitter-web-presence');
var collections = require('gitter-web-utils/lib/collections');
var pushNotificationService = require('gitter-web-push-notifications');
var pushNotificationFilter = require('gitter-web-push-notification-filter');
var _ = require('lodash');

var STATUS_INROOM = 'inroom';
var STATUS_ONLINE = 'online';
var STATUS_MOBILE = 'mobile';
var STATUS_PUSH = 'push';
var STATUS_PUSH_CONNECTED = 'push_connected';
var STATUS_PUSH_NOTIFIED = 'push_notified';
var STATUS_PUSH_NOTIFIED_CONNECTED = 'push_notified_connected';

/*
 * Categorize users in a room by their notification status, returns a value
 * hashed by userid
 *
 * values can be:
 *  - inroom: currently in the room
 *  - online: currently online
 *  - mobile: currently online on mobile, without push notifications
 *  - push: awaiting a push notification
 *  - push_connected:  similar to push, but user is connected via bayeux
 *  - push_notified: already used up all their push notifications. Only push for mentions
 *  - push_notified_connected: similar to push_notified, but user is connected via bayeux
 *  - <doesnotexist>: user is offline, nothing more to do
 */
module.exports = function(roomId, userIds) {
  if (!userIds || !userIds.length) return Promise.resolve({});

  return Promise.join(
    presenceService.findOnlineUsersForTroupe(roomId),
    presenceService.categorizeUsersByOnlineStatus(userIds),
    function(userIdsInRoom, onlineStatus) {
      var inRoomHash = collections.hashArray(userIdsInRoom);

      var result = {};
      var mobileAndOffline = [];

      _.each(userIds, function(userId) {
        if (inRoomHash[userId]) {
          result[userId] = STATUS_INROOM;
        } else {
          var status = onlineStatus[userId];
          switch (status) {
            case 'online':
              result[userId] = STATUS_ONLINE;
              break;
            case 'mobile':
              result[userId] = STATUS_MOBILE;
              mobileAndOffline.push(userId);
              break;
            default:
              mobileAndOffline.push(userId);
          }
        }
      });

      if (!mobileAndOffline.length) {
        return result;
      }

      return pushNotificationService
        .findUsersWithDevices(mobileAndOffline)
        .then(function(withDevices) {
          if (!withDevices.length) {
            /* No devices with push... */
            return result;
          }

          return pushNotificationFilter
            .findUsersInRoomAcceptingNotifications(roomId, withDevices)
            .then(function(usersWithDevicesAcceptingNotifications) {
              _.each(usersWithDevicesAcceptingNotifications, function(userId) {
                if (result[userId] === STATUS_MOBILE) {
                  result[userId] = STATUS_PUSH_CONNECTED;
                } else {
                  result[userId] = STATUS_PUSH;
                }
              });

              _.each(withDevices, function(userId) {
                var status = result[userId];
                if (!status) {
                  // If the user is not STATUS_PUSH, they should be STATUS_PUSH_NOTIFIED
                  result[userId] = STATUS_PUSH_NOTIFIED;
                } else if (status === STATUS_MOBILE) {
                  result[userId] = STATUS_PUSH_NOTIFIED_CONNECTED;
                }
              });

              return result;
            });
        });
    }
  );
};
