'use strict';

var PushNotificationDevice = require('gitter-web-persistence').PushNotificationDevice;
var crypto = require('crypto');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var debug = require('debug')('gitter:app:push-notification-service');
var uniqueIds = require('mongodb-unique-ids');
var _ = require('lodash');
var assert = require('assert');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

function buffersEqual(a, b) {
  if (!Buffer.isBuffer(a)) return undefined;
  if (!Buffer.isBuffer(b)) return undefined;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const cursor = PushNotificationDevice.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

function findAndRemoveDevicesWithDuplicateTokens(deviceId, deviceType, deviceToken, tokenHash) {
  return PushNotificationDevice.find({
    tokenHash: tokenHash,
    deviceType: deviceType
  })
    .exec()
    .then(function(devices) {
      var devicesToRemove = devices.filter(function(device) {
        // This device? Skip
        if (device.deviceId === deviceId) return false;

        // If the hashes are the same, we still need to check that the actual tokens are the same
        if (device.deviceToken && deviceToken) {
          if (!buffersEqual(device.deviceToken, deviceToken)) return false;
        }

        return true;
      });

      return Promise.map(devicesToRemove, function(device) {
        debug('Removing unused device %s', device.deviceId);
        return device.remove();
      });
    });
}

function hash(token) {
  return crypto
    .createHash('md5')
    .update(token)
    .digest('hex');
}

function registerDevice(deviceId, deviceType, deviceToken, deviceName, appVersion, appBuild) {
  debug('Registering device %s', deviceId);
  var tokenHash = hash(deviceToken);

  return PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    {
      deviceId: deviceId,
      appleToken: deviceToken.toString('hex'),
      tokenHash: tokenHash,
      deviceType: deviceType,
      deviceName: deviceName,
      timestamp: new Date(),
      appVersion: appVersion,
      appBuild: appBuild,
      enabled: true
    },
    { upsert: true, new: true }
  )
    .exec()
    .then(function(device) {
      // After we've update the device, look for other devices that have given us the same token
      // these are probably phones that have been reset etc, so we need to prune them
      return findAndRemoveDevicesWithDuplicateTokens(
        deviceId,
        deviceType,
        deviceToken,
        tokenHash
      ).thenReturn(device);
    });
}

function registerAndroidDevice(deviceId, deviceName, registrationId, appVersion, userId) {
  debug('Registering device %s', deviceId);
  var tokenHash = hash(registrationId);

  return PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    {
      userId: userId,
      deviceId: deviceId,
      androidToken: registrationId,
      tokenHash: tokenHash,
      deviceType: 'ANDROID',
      deviceName: deviceName,
      timestamp: new Date(),
      appVersion: appVersion,
      enabled: true
    },
    { upsert: true, new: true }
  )
    .exec()
    .then(function(device) {
      // After we've update the device, look for other devices that have given us the same token
      // these are probably phones that have been reset etc, so we need to prune them
      return findAndRemoveDevicesWithDuplicateTokens(
        deviceId,
        'ANDROID',
        registrationId,
        tokenHash
      ).thenReturn(device);
    });
}

function registerVapidSubscription(subscription, userId) {
  assert(subscription, 'subscription required');

  var endpoint = subscription.endpoint;
  var auth = subscription.keys && subscription.keys.auth;
  var p256dh = subscription.keys && subscription.keys.p256dh;

  assert(subscription.endpoint, 'subscription.endpoint required');
  assert(typeof endpoint === 'string', 'subscription.endpoint must be a string');
  assert(typeof auth === 'string', 'subscription.keys.auth must be a string');
  assert(typeof p256dh === 'string', 'subscription.keys.p256dh must be a string');

  debug('Registering vapid endpoint %s', endpoint);

  return PushNotificationDevice.findOneAndUpdate(
    {
      deviceId: endpoint
    },
    {
      $set: {
        userId: userId,
        deviceId: endpoint,
        deviceType: 'VAPID',
        timestamp: new Date(),
        enabled: true,
        vapid: {
          auth: auth,
          p256dh: p256dh
        }
      }
    },
    {
      upsert: true,
      new: true
    }
  ).exec();
}

function deregisterDeviceById(id) {
  return PushNotificationDevice.findByIdAndRemove(id).exec();
}

function deregisterIosDevices(deviceTokens) {
  if (deviceTokens.length === 0) return Promise.resolve();

  var appleTokens = deviceTokens.map(function(deviceToken) {
    return deviceToken.toString('hex');
  });

  // tokenHashes needed as appleTokens/deviceTokens are not indexed
  var tokenHashes = deviceTokens.map(function(deviceToken) {
    return hash(deviceToken);
  });

  // mongo will do an indexBounded query with the hashes (super fast) before filtering by appleToken
  return PushNotificationDevice.remove({
    tokenHash: { $in: tokenHashes },
    appleToken: { $in: appleTokens }
  }).exec();
}

function registerUser(deviceId, userId) {
  return PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    { deviceId: deviceId, userId: userId, timestamp: new Date() },
    { upsert: true, new: true }
  ).exec();
}

var usersWithDevicesCache = null;
function getCachedUsersWithDevices() {
  if (usersWithDevicesCache) {
    return Promise.resolve(usersWithDevicesCache);
  }

  return PushNotificationDevice.distinct('userId')
    .exec()
    .then(function(userIds) {
      usersWithDevicesCache = userIds.reduce(function(memo, userId) {
        memo[userId] = true;
        return memo;
      }, {});

      // Expire the cache after 60 seconds
      setTimeout(expireCachedUsersWithDevices, 60000);

      return usersWithDevicesCache;
    });
}

function expireCachedUsersWithDevices() {
  usersWithDevicesCache = null;
}

function findUsersWithDevices(userIds) {
  return getCachedUsersWithDevices().then(function(usersWithDevices) {
    return _.filter(userIds, function(userId) {
      // Only true if the user has a device...
      return usersWithDevices[userId];
    });
  });
}

function findEnabledDevicesForUsers(userIds, options) {
  userIds = mongoUtils.asObjectIDs(uniqueIds(userIds));
  var query = {
    userId: { $in: userIds },
    $or: [{ enabled: true }, { enabled: { $exists: false } }]
  };

  if (options && options.supportsBadges) {
    // Only ios devices support badges
    query.deviceType = { $in: ['APPLE', 'APPLE-DEV'] };
    query.appleToken = { $ne: null };
  }

  return PushNotificationDevice.find(query).exec();
}

module.exports = {
  getCursorByUserId,
  registerDevice: registerDevice,
  registerAndroidDevice: registerAndroidDevice,
  registerVapidSubscription: registerVapidSubscription,
  deregisterDeviceById: deregisterDeviceById,
  deregisterIosDevices: deregisterIosDevices,
  registerUser: registerUser,
  findUsersWithDevices: findUsersWithDevices,
  findEnabledDevicesForUsers: findEnabledDevicesForUsers,
  testOnly: {
    expireCachedUsersWithDevices: expireCachedUsersWithDevices
  }
};
