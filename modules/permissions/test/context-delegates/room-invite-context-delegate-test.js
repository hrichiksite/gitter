'use strict';

var TroupeInvite = require('gitter-web-persistence').TroupeInvite;
var ObjectID = require('mongodb').ObjectID;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var RoomInviteContextDelegate = require('../../lib/context-delegates/room-invite-context-delegate');
var assert = require('assert');

describe('room-invite-context-delegate', function() {
  var troupeId;
  var userIdInviter;
  var userId1;
  var userId2;
  var secret1;
  var secret2;
  var secret3;

  before(function() {
    troupeId = new ObjectID();
    userIdInviter = new ObjectID();
    userId1 = new ObjectID();
    userId2 = new ObjectID();
    function createInvite(userId, state) {
      var secret = 'test-' + Date.now() + Math.random();
      return TroupeInvite.create({
        troupeId: troupeId,
        type: 'email',
        emailAddress: fixtureLoader.generateEmail(),
        externalId: fixtureLoader.generateEmail(),
        userId: userId,
        invitedByUserId: userIdInviter,
        secret: secret,
        state: state,
        reminderSent: null
      }).return(secret);
    }
    return Promise.join(
      createInvite(null, 'PENDING'),
      createInvite(userId1, 'ACCEPTED'),
      createInvite(userId2, 'REJECTED'),
      function(s1, s2, s3) {
        secret1 = s1;
        secret2 = s2;
        secret3 = s3;
      }
    );
  });

  it('should allow an invite to be used', function() {
    var r = new RoomInviteContextDelegate(userId1, troupeId, secret1);
    return r.isMember().then(function(result) {
      assert.strictEqual(result, true);
    });
  });

  it('should allow a rejected invite to be re-used by the same user', function() {
    var r = new RoomInviteContextDelegate(userId2, troupeId, secret3);
    return r.isMember().then(function(result) {
      assert.strictEqual(result, true);
    });
  });

  it('should not allow an accepted invite to be re-used by the same user', function() {
    var r = new RoomInviteContextDelegate(userId1, troupeId, secret2);
    return r.isMember().then(function(result) {
      assert.strictEqual(result, false);
    });
  });

  it('should not allow an rejected invite to be re-used by the another user', function() {
    var r = new RoomInviteContextDelegate(userId1, troupeId, secret3);
    return r.isMember().then(function(result) {
      assert.strictEqual(result, false);
    });
  });

  it('should not allow an invalid secret to be used', function() {
    var r = new RoomInviteContextDelegate(userId1, troupeId, 'fobar' + Math.random());
    return r.isMember().then(function(result) {
      assert.strictEqual(result, false);
    });
  });

  it('should handle handleReadAccessFailure when the user is not in the room', function() {
    var delegate = new RoomInviteContextDelegate(userId1, troupeId, secret3);
    return delegate.handleReadAccessFailure();
  });
});
