'use strict';

var env = require('gitter-web-env');
var Promise = require('bluebird');
var logger = env.logger.get('push-notifications');
var stats = env.stats;
var pushNotificationService = require('gitter-web-push-notifications');
var unreadItemService = require('gitter-web-unread-items');
var androidGateway = require('gitter-web-push-gateways/lib/android/android-notification-gateway');
var iosGateway = require('gitter-web-push-gateways/lib/ios/ios-notification-gateway');
var vapidGateway = require('gitter-web-push-gateways/lib/vapid/vapid-notification-gateway');
var debug = require('debug')('gitter:app:push-notification-gateway');
var InvalidRegistrationError = require('gitter-web-push-gateways/lib/invalid-registration-error');
var _ = require('lodash');

function getGatewayForDevice(device) {
  switch (device.deviceType) {
    case 'APPLE':
    case 'APPLE-DEV':
      if (!device.appleToken) {
        return;
      }

      return iosGateway;

    case 'ANDROID':
      return androidGateway;

    case 'VAPID':
      return vapidGateway;

    default:
      logger.warn('Unknown device type', { deviceType: device.deviceType });
      return;
  }
}

function sendNotificationToDevice(notificationType, notificationDetails, device) {
  var gateway = getGatewayForDevice(device);

  if (!gateway) return false;

  return gateway
    .sendNotificationToDevice(notificationType, notificationDetails, device)
    .bind({
      device: device
    })
    .tap(function(notificationSent) {
      if (!notificationSent) return;

      var device = this.device;

      stats.event('push_notification', {
        userId: device.userId,
        deviceType: device.deviceType
      });
    })
    .catch(InvalidRegistrationError, function() {
      // The gateway has told us to get rid of this
      // device....
      var device = this.device;
      logger.info('Removing invalid device', { id: device._id, userId: device.userId });
      return pushNotificationService.deregisterDeviceById(device._id);
    })
    .catch(function(err) {
      var device = this.device;
      logger.warn('Failure sending notification', {
        id: device._id,
        user: device.userId,
        exception: err
      });
    });
}

async function sendUserNotification(notificationType, userId, options) {
  const devices = await pushNotificationService.findEnabledDevicesForUsers([userId]);

  if (!devices || !devices.length) return;

  const hasDevicesSupportingBadges = devices.some(device => {
    return device.deviceType === 'APPLE' || device.deviceType === 'APPLE-DEV';
  });

  let counts = null;
  // Skip badge calculation if we don't need it....
  if (hasDevicesSupportingBadges) {
    counts = await unreadItemService.getBadgeCountsForUserIds([userId]);
  }

  const badgeCount = (counts && counts[userId]) || 0;

  const notificationDetails = {
    badgeCount: badgeCount,
    ...options
  };

  return Promise.map(devices, device => {
    return sendNotificationToDevice(notificationType, notificationDetails, device);
  });
}

function sendUsersBadgeUpdates(userIds) {
  debug('Sending push notifications to %s users', userIds.length);

  // This seems a bit sketchy....
  if (!Array.isArray(userIds)) userIds = [userIds];

  return pushNotificationService
    .findEnabledDevicesForUsers(userIds, { supportsBadges: true })
    .then(function(devices) {
      if (!devices.length) return;

      var uniqueUserIds = Object.keys(
        _.reduce(function(memo, device) {
          memo[device.userId] = 1;
          return memo;
        }, {})
      );

      debug(
        'Sending badge updates to %s potential devices for %s users',
        devices.length,
        uniqueUserIds.length
      );

      return unreadItemService.getBadgeCountsForUserIds(uniqueUserIds).then(function(counts) {
        return Promise.map(devices, function(device) {
          var badge = counts[device.userId] || 0;

          return iosGateway.sendBadgeUpdateToDevice(badge, device);
        });
      });
    });
}

module.exports = {
  sendUserNotification: sendUserNotification,
  sendUsersBadgeUpdates: sendUsersBadgeUpdates
};
