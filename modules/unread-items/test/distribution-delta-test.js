'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');
var Promise = require('bluebird');
var Distribution = require('../lib/distribution');
var roomMembershipFlags = require('gitter-web-rooms/lib/room-membership-flags');
var MODES = roomMembershipFlags.MODES;

describe('distribution-delta', function() {
  describe('straight mentions', function() {
    var distributionDelta, createDistribution;
    var troupeId, fromUserId, userId1, userId2, userId3, troupe;

    beforeEach(function() {
      troupeId = mongoUtils.getNewObjectIdString() + '';
      fromUserId = 'from';
      userId1 = '1';
      userId2 = '2';
      userId3 = '3';
      troupe = {
        _id: troupeId,
        id: troupeId
      };

      createDistribution = function(fromUserId, troupe, mentions /*, options*/) {
        return Promise.resolve(
          new Distribution({
            membersWithFlags: [
              {
                userId: userId1,
                flags: MODES.all
              },
              {
                userId: userId2,
                flags: MODES.all
              },
              {
                userId: userId3,
                flags: MODES.all
              }
            ],
            mentions: mentions
          })
        );
      };

      distributionDelta = proxyquireNoCallThru('../lib/distribution-delta', {
        './create-distribution': createDistribution
      });
    });

    it('should handle the trivial case', function() {
      return distributionDelta(fromUserId, troupe, [], []).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), []);
        assert.deepEqual(result.remove.toArray(), []);
      });
    });

    it('should handle mention list not changing', function() {
      return distributionDelta(fromUserId, troupe, [userId1, userId2], [userId1, userId2]).spread(
        function(result, newDistribution) {
          assert(newDistribution);
          assert.deepEqual(result.add.toArray(), []);
          assert.deepEqual(result.remove.toArray(), []);
        }
      );
    });

    it('should handle a mention being added', function() {
      return distributionDelta(fromUserId, troupe, [userId1], []).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), [
          {
            userId: userId1,
            mention: true
          }
        ]);
        assert.deepEqual(result.remove.toArray(), []);
      });
    });

    it('should handle a mention being removed', function() {
      return distributionDelta(fromUserId, troupe, [], [userId1]).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), [
          {
            userId: userId1,
            mention: false
          }
        ]);
        assert.deepEqual(result.remove.toArray(), [userId1]);
      });
    });
  });

  describe('mute mode users', function() {
    var distributionDelta, createDistribution;
    var troupeId, fromUserId, userId1, userId2, userId3, troupe;

    beforeEach(function() {
      troupeId = mongoUtils.getNewObjectIdString() + '';
      fromUserId = mongoUtils.getNewObjectIdString() + '';
      userId1 = mongoUtils.getNewObjectIdString() + '';
      userId2 = mongoUtils.getNewObjectIdString() + '';
      userId3 = mongoUtils.getNewObjectIdString() + '';
      troupe = {
        _id: troupeId,
        id: troupeId
      };

      createDistribution = function(fromUserId, troupe, mentions /*, options*/) {
        return Promise.resolve(
          new Distribution({
            membersWithFlags: [
              {
                userId: userId1,
                flags: MODES.mute
              },
              {
                userId: userId2,
                flags: MODES.mute
              },
              {
                userId: userId3,
                flags: MODES.mute
              }
            ],
            mentions: mentions
          })
        );
      };

      distributionDelta = proxyquireNoCallThru('../lib/distribution-delta', {
        './create-distribution': createDistribution
      });
    });

    it('should handle mention list not changing', function() {
      return distributionDelta(fromUserId, troupe, [userId1, userId2], [userId1, userId2]).spread(
        function(result, newDistribution) {
          assert(newDistribution);
          assert.deepEqual(result.add.toArray(), []);
          assert.deepEqual(result.remove.toArray(), []);
        }
      );
    });

    it('should handle a mention being added', function() {
      return distributionDelta(fromUserId, troupe, [userId1], []).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), [
          {
            userId: userId1,
            mention: true
          }
        ]);
        assert.deepEqual(result.remove.toArray(), []);
      });
    });

    it('should handle a mention being removed', function() {
      return distributionDelta(fromUserId, troupe, [], [userId1]).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), []);
        assert.deepEqual(result.remove.toArray(), [userId1]);
      });
    });
  });

  describe('announcements', function() {
    var distributionDelta, createDistribution;
    var troupeId, fromUserId, userId1, userId2, userId3, troupe;
    var originalIsAnnouncement, newIsAnnouncement;

    beforeEach(function() {
      troupeId = mongoUtils.getNewObjectIdString() + '';
      fromUserId = mongoUtils.getNewObjectIdString() + '';
      userId1 = mongoUtils.getNewObjectIdString() + '';
      userId2 = mongoUtils.getNewObjectIdString() + '';
      userId3 = mongoUtils.getNewObjectIdString() + '';
      troupe = {
        _id: troupeId,
        id: troupeId
      };
      originalIsAnnouncement = false;
      newIsAnnouncement = false;

      createDistribution = function(fromUserId, troupe, mentions, options) {
        var original = options && options.delta;
        var announcement = original ? originalIsAnnouncement : newIsAnnouncement;

        return Promise.resolve(
          new Distribution({
            announcement: announcement,
            membersWithFlags: [
              {
                userId: userId1,
                flags: MODES.all
              },
              {
                userId: userId2,
                flags: MODES.announcement
              },
              {
                userId: userId3,
                flags: MODES.mute
              }
            ],
            mentions: mentions
          })
        );
      };

      distributionDelta = proxyquireNoCallThru('../lib/distribution-delta', {
        './create-distribution': createDistribution
      });
    });

    it('should handle a message changing from no mentions to an announcement', function() {
      newIsAnnouncement = true;
      originalIsAnnouncement = false;
      return distributionDelta(fromUserId, troupe, [], []).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), [
          {
            userId: userId1,
            mention: true
          },
          {
            userId: userId2,
            mention: true
          }
        ]);
        assert.deepEqual(result.remove.toArray(), []);
      });
    });

    it('should handle a message changing from an announcement to not an announcement', function() {
      newIsAnnouncement = false;
      originalIsAnnouncement = true;

      return distributionDelta(fromUserId, troupe, [], []).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), [
          {
            userId: userId1,
            mention: false
          },
          {
            userId: userId2,
            mention: false
          }
        ]);
        assert.deepEqual(result.remove.toArray(), [userId1, userId2]);
      });
    });

    it('should handle an `all` mode mention being added to an announcement', function() {
      newIsAnnouncement = true;
      originalIsAnnouncement = true;

      return distributionDelta(fromUserId, troupe, [userId1], []).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), []);
        assert.deepEqual(result.remove.toArray(), []);
      });
    });

    it('should handle an `mute` mode mention being added to an announcement', function() {
      newIsAnnouncement = true;
      originalIsAnnouncement = true;

      return distributionDelta(fromUserId, troupe, [userId3], []).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), [
          {
            userId: userId3,
            mention: true
          }
        ]);
        assert.deepEqual(result.remove.toArray(), []);
      });
    });

    it('should handle an `mute` mode mention being removed from an announcement', function() {
      newIsAnnouncement = true;
      originalIsAnnouncement = true;

      return distributionDelta(fromUserId, troupe, [], [userId3]).spread(function(
        result,
        newDistribution
      ) {
        assert(newDistribution);
        assert.deepEqual(result.add.toArray(), []);
        assert.deepEqual(result.remove.toArray(), [userId3]);
      });
    });
  });
});
