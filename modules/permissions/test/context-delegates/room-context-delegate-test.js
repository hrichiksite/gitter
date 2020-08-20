'use strict';

var assert = require('assert');
var RoomContextDelegate = require('../../lib/context-delegates/room-context-delegate');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');

describe('room-context-delegate', function() {
  describe('integration tests #slow', function() {
    var permCheckFailedRoomId = null;
    var permCheckFailedUserId = null;

    before(function() {
      appEvents.onRoomMemberPermCheckFailed(function(roomId, userId) {
        permCheckFailedRoomId = roomId;
        permCheckFailedUserId = userId;
      });
    });

    beforeEach(function() {
      permCheckFailedRoomId = null;
      permCheckFailedUserId = null;
    });

    fixtureLoader.disableMongoTableScans();

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      troupe1: {
        users: ['user1']
      }
    });

    it('should work with users in the room', function() {
      var delegate = new RoomContextDelegate(fixture.user1._id, fixture.troupe1._id);
      return delegate.isMember().then(function(result) {
        assert.strictEqual(result, true);
      });
    });

    it('should work with users not in the room', function() {
      var delegate = new RoomContextDelegate(fixture.user2._id, fixture.troupe1._id);
      return delegate.isMember().then(function(result) {
        assert.strictEqual(result, false);
      });
    });

    it('should handle handleReadAccessFailure when the user is in the room', function() {
      var delegate = new RoomContextDelegate(fixture.user1._id, fixture.troupe1._id);
      return delegate.handleReadAccessFailure().then(function() {
        assert.strictEqual(permCheckFailedRoomId, fixture.troupe1._id);
        assert.strictEqual(permCheckFailedUserId, fixture.user1._id);
      });
    });

    it('should handle handleReadAccessFailure when the user is not in the room', function() {
      var delegate = new RoomContextDelegate(fixture.user2._id, fixture.troupe1._id);
      return delegate.handleReadAccessFailure().then(function() {
        assert.strictEqual(permCheckFailedRoomId, null);
        assert.strictEqual(permCheckFailedUserId, null);
      });
    });
  });
});
