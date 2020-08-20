'use strict';

var pushNotificationService = require('../lib/push-notification-service');
var persistenceService = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('push-notification-service', function() {
  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    describe('findUsersWithDevices', function() {
      it('should find a user with a registered device', function() {
        var userId = mongoUtils.getNewObjectIdString();

        pushNotificationService.testOnly.expireCachedUsersWithDevices();

        return pushNotificationService
          .registerUser('DEVICE1', userId)
          .then(function() {
            return pushNotificationService.findUsersWithDevices([userId]);
          })
          .then(function(userIds) {
            assert.strictEqual(userIds.length, 1);
            assert.equal(userIds[0], userId);
          });
      });

      it('should not find user without a registered device', function() {
        var userId = mongoUtils.getNewObjectIdString();

        return pushNotificationService.findUsersWithDevices([userId]).then(function(userIds) {
          assert.strictEqual(userIds.length, 0);
        });
      });

      it('should prune unused old devices', function() {
        var token = 'TESTTOKEN';

        return pushNotificationService
          .registerDevice('DEVICE1', 'TEST', token, 'TESTDEVICE', '1.0.1', '122')
          .then(function() {
            // Different device, same token
            return pushNotificationService.registerDevice(
              'DEVICE2',
              'TEST',
              token,
              'OTHERTESTDEVICE',
              '1.0.1',
              '122'
            );
          })
          .then(function() {
            return persistenceService.PushNotificationDevice.find({
              deviceType: 'TEST',
              deviceId: 'DEVICE1'
            }).exec();
          })
          .then(function(devices) {
            assert.equal(devices.length, 0);
          });
      });

      it('should findEnabledDevicesForUsers', function() {
        var registrationId = 'TESTTOKEN-' + Date.now();
        var deviceId = 'DEVICE1' + Date.now();
        var userId = mongoUtils.getNewObjectIdString();

        return pushNotificationService
          .registerAndroidDevice(deviceId, 'Android', registrationId, '1.0', userId)
          .then(function() {
            return pushNotificationService.findEnabledDevicesForUsers([userId]);
          })
          .then(function(devices) {
            assert.strictEqual(devices.length, 1);
            assert.strictEqual(devices[0].deviceId, deviceId);

            return pushNotificationService.findEnabledDevicesForUsers([userId], {
              supportsBadges: true
            });
          })
          .then(function(devices) {
            assert.deepEqual(devices, []);
          });
      });
    });
  });
});
