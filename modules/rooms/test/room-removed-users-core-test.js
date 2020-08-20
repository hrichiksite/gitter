'use strict';

var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var roomRemovedUserCore = require('../lib/room-removed-user-core');
var TroupeRemovedUser = require('gitter-web-persistence').TroupeRemovedUser;

describe('room-removed-users-core', function() {
  describe('addRemovedUser', function() {
    it('should record a removed user', function() {
      var userId = new ObjectID();
      var roomId = new ObjectID();

      return roomRemovedUserCore
        .addRemovedUser(roomId, userId)
        .then(function() {
          return TroupeRemovedUser.findOne({ troupeId: roomId, userId: userId })
            .lean()
            .exec();
        })
        .then(function(result) {
          assert(result);
          assert(Date.now() - result.date > 0);
          assert(Date.now() - result.date < 1000);
          assert.equal(String(result.userId), String(userId));
          assert.equal(String(result.troupeId), String(roomId));
        });
    });
  });

  describe('addRemovedUsers', function() {
    it('should record removed users', function() {
      var userId1 = new ObjectID();
      var userId2 = new ObjectID();
      var roomId = new ObjectID();

      return roomRemovedUserCore
        .addRemovedUsers(roomId, [userId1, userId2])
        .then(function() {
          return TroupeRemovedUser.findOne({ troupeId: roomId, userId: userId1 })
            .lean()
            .exec();
        })
        .then(function(result) {
          assert(result);
          assert(Date.now() - result.date > 0);
          assert(Date.now() - result.date < 1000);
          assert.equal(String(result.userId), String(userId1));
          assert.equal(String(result.troupeId), String(roomId));

          return TroupeRemovedUser.findOne({ troupeId: roomId, userId: userId1 })
            .lean()
            .exec();
        })
        .then(function(result) {
          assert(result);
          assert(Date.now() - result.date > 0);
          assert(Date.now() - result.date < 1000);
          assert.equal(String(result.userId), String(userId1));
          assert.equal(String(result.troupeId), String(roomId));
        });
    });
  });
});
