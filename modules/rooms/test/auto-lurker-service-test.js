/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var autoLurkerService = require('../lib/auto-lurker-service');
var recentRoomService = require('../lib/recent-room-service');
var roomMembershipService = require('../lib/room-membership-service');
var roomService = require('../lib/room-service');

describe('auto-lurker-service', function() {
  describe('#findLurkCandidates', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'], lastAccessTime: false },
      troupe2: { users: ['user1'], lastAccessTime: false }
    });

    it('should return a lurk candidate', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return recentRoomService
        .saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, {
          lastAccessTime: tenDaysAgo
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert.strictEqual(candidates.length, 1);

          assert.equal(candidates[0].userId, fixture.user1.id);
          assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        });
    });

    it('should return a lurk candidate with notify settings', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return roomMembershipService
        .setMembershipMode(fixture.user1.id, fixture.troupe1.id, 'all')
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(
            fixture.user1.id,
            fixture.troupe1.id,
            { lastAccessTime: tenDaysAgo }
          );
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert.strictEqual(candidates.length, 1);

          assert.equal(candidates[0].userId, fixture.user1.id);
          assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        });
    });

    it('should return a lurk candidate with notify settings', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return roomMembershipService
        .setMembershipMode(fixture.user1.id, fixture.troupe1.id, 'all')
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(
            fixture.user1.id,
            fixture.troupe1.id,
            { lastAccessTime: tenDaysAgo }
          );
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert.strictEqual(candidates.length, 1);

          assert.equal(candidates[0].userId, fixture.user1.id);
          assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        });
    });

    it('should not return fully lurked candidates', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return roomMembershipService
        .setMembershipMode(fixture.user1.id, fixture.troupe1.id, 'mention')
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(
            fixture.user1.id,
            fixture.troupe1.id,
            { lastAccessTime: tenDaysAgo }
          );
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert.strictEqual(candidates.length, 1);

          assert.equal(candidates[0].userId, fixture.user1.id);
          assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        });
    });

    it('should identify users for lurk based on the date they were added to the room if they have not logged in', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return roomService.testOnly
        .updateUserDateAdded(fixture.user1.id, fixture.troupe2.id, tenDaysAgo)
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe2, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert.strictEqual(candidates.length, 1);
          assert.equal(candidates[0].userId, fixture.user1.id);
          assert.strictEqual(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        });
    });

    it('should ignore date added if the user has accessed the room since then', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      var twoDaysAgo = new Date(Date.now() - 86400000 * 2);

      return roomService.testOnly
        .updateUserDateAdded(fixture.user1.id, fixture.troupe2.id, tenDaysAgo)
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(
            fixture.user1.id,
            fixture.troupe2.id,
            { lastAccessTime: twoDaysAgo }
          );
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe2, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert.strictEqual(candidates.length, 1);
          assert.equal(candidates[0].userId, fixture.user1.id);
          assert.strictEqual(candidates[0].lastAccessTime.valueOf(), twoDaysAgo.valueOf());
        });
    });
  });

  describe('#autoLurkInactiveUsers', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'], lastAccessTime: false }
    });

    it('should return a lurk candidate', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return recentRoomService
        .saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, {
          lastAccessTime: tenDaysAgo
        })
        .then(function() {
          return autoLurkerService.autoLurkInactiveUsers(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function() {
          return [
            roomMembershipService.getMembershipMode(fixture.user1.id, fixture.troupe1.id),
            roomMembershipService.getMemberLurkStatus(fixture.troupe1.id, fixture.user1.id)
          ];
        })
        .spread(function(settings, lurkStatus) {
          assert.strictEqual(settings, 'mute');
          assert.strictEqual(true, lurkStatus);
        });
    });

    it('should return a lurk candidate with notify settings', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return roomMembershipService
        .setMembershipMode(fixture.user1.id, fixture.troupe1.id, 'mention')
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(
            fixture.user1.id,
            fixture.troupe1.id,
            { lastAccessTime: tenDaysAgo }
          );
        })
        .then(function() {
          return autoLurkerService.autoLurkInactiveUsers(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function() {
          return [
            roomMembershipService.getMembershipMode(fixture.user1.id, fixture.troupe1.id),
            roomMembershipService.getMemberLurkStatus(fixture.troupe1.id, fixture.user1.id)
          ];
        })
        .spread(function(settings, lurkStatus) {
          assert.strictEqual(settings, 'mute');
          assert.strictEqual(true, lurkStatus);
        });
    });

    it('should return a lurk candidate with notify settings', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return roomMembershipService
        .setMembershipMode(fixture.user1.id, fixture.troupe1.id, 'mute')
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(
            fixture.user1.id,
            fixture.troupe1.id,
            { lastAccessTime: tenDaysAgo }
          );
        })
        .then(function() {
          return autoLurkerService.autoLurkInactiveUsers(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function() {
          return [
            roomMembershipService.getMembershipMode(fixture.user1.id, fixture.troupe1.id),
            roomMembershipService.getMemberLurkStatus(fixture.troupe1.id, fixture.user1.id)
          ];
        })
        .spread(function(settings, lurkStatus) {
          assert.strictEqual(settings, 'mute');
          assert.strictEqual(true, lurkStatus);
        });
    });
  });
});
