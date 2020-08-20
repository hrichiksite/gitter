'use strict';

var fingerprintingService = require('../lib/fingerprinting-service');
var Fingerprint = require('gitter-web-persistence').Fingerprint;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

describe('fingerprinting-service', function() {
  describe('integration tests #slow', function() {
    it('should fingerprint', function() {
      var userId = new ObjectID();
      return fingerprintingService
        .recordFingerprint(userId, 'test', '192.168.0.1')
        .then(function() {
          return Fingerprint.findOne({ userId: userId }, {}, { lean: true });
        })
        .then(function(record) {
          assert.strictEqual(String(record.userId), String(userId));
          assert.strictEqual(record.fingerprints.length, 1);
          assert(record.fingerprints[0]._id);
          assert.strictEqual(record.fingerprints[0].fingerprint, 'test');
          assert.strictEqual(record.fingerprints[0].ipAddress, '192.168.0.1');
        });
    });

    it('should keep the 5 most recent fingerprints', function() {
      var userId = new ObjectID();
      return fingerprintingService
        .recordFingerprint(userId, 'test1', '192.168.0.1')
        .then(function() {
          return fingerprintingService.recordFingerprint(userId, 'test2', '192.168.0.2');
        })
        .then(function() {
          return fingerprintingService.recordFingerprint(userId, 'test3', '192.168.0.3');
        })
        .then(function() {
          return fingerprintingService.recordFingerprint(userId, 'test4', '192.168.0.4');
        })
        .then(function() {
          return fingerprintingService.recordFingerprint(userId, 'test5', '192.168.0.5');
        })
        .then(function() {
          return fingerprintingService.recordFingerprint(userId, 'test6', '192.168.0.6');
        })
        .then(function() {
          return Fingerprint.findOne({ userId: userId }, {}, { lean: true });
        })
        .then(function(record) {
          assert.strictEqual(String(record.userId), String(userId));
          assert.strictEqual(record.fingerprints.length, 5);
          assert.deepEqual(
            record.fingerprints.map(function(f) {
              return f.fingerprint;
            }),
            ['test6', 'test5', 'test4', 'test3', 'test2']
          );

          assert.deepEqual(
            record.fingerprints.map(function(f) {
              return f.ipAddress;
            }),
            ['192.168.0.6', '192.168.0.5', '192.168.0.4', '192.168.0.3', '192.168.0.2']
          );
        });
    });
  });
});
