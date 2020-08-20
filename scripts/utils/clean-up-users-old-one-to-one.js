#!/usr/bin/env node
'use strict';

process.env.NO_AUTO_INDEX = 1;

var opts = require('yargs')
  .option('username', {
    type: 'string',
    required: true,
    description: 'Username',
    string: true
  })
  .option('dry-run', {
    type: 'boolean',
    description: 'Dry-run. Do not execute, just print out candidates'
  })
  .help('help')
  .alias('help', 'h').argv;

var Promise = require('bluebird');
var userService = require('gitter-web-users');
var oneToOneRoomService = require('gitter-web-rooms/lib/one-to-one-room-service');
var unreadItemsService = require('gitter-web-unread-items');
var recentRoomCore = require('gitter-web-rooms/lib/recent-room-core');
var roomService = require('gitter-web-rooms');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var collections = require('gitter-web-utils/lib/collections');
var shutdown = require('shutdown');

var MIN_DAYS_CUTOFF = 365;

function getOtherUserId(userId, room) {
  if (room.oneToOneUsers.length !== 2) return null;

  if (mongoUtils.objectIDsEqual(room.oneToOneUsers[0].userId, userId)) {
    return room.oneToOneUsers[1].userId;
  } else {
    return room.oneToOneUsers[0].userId;
  }
}

function findCandidates(username, dryRun) {
  return userService
    .findByUsername(username)
    .bind({
      user: null
    })
    .then(function(user) {
      this.user = user;
      return oneToOneRoomService.findOneToOneRoomsForUserId(user._id);
    })
    .then(function(oneToOneRooms) {
      this.oneToOneRooms = oneToOneRooms;

      var roomIds = oneToOneRooms.map(function(room) {
        return room._id;
      });

      return unreadItemsService.getUserUnreadCountsForTroupeIds(this.user._id, roomIds);
    })
    .then(function(unreadItems) {
      var candidates = this.oneToOneRooms.filter(function(room) {
        var unreadCount = unreadItems[room._id];
        if (!unreadCount) return true;
        return unreadCount.unreadItems === 0 && unreadCount.mentions === 0;
      });

      this.candidates = candidates;
      return recentRoomCore.getTroupeLastAccessTimesForUser(this.user._id);
    })
    .then(function(lastAccessTimes) {
      var now = Date.now();

      var candidates = this.candidates.filter(function(room) {
        var lat = lastAccessTimes[room._id];
        if (!lat) return true;
        var lastAccessDays = (now - lat) / (86400 * 1000);
        room.lastAccessTime = lat;
        return lastAccessDays > MIN_DAYS_CUTOFF;
      });

      if (dryRun) {
        return printCandidates(this.user, candidates);
      } else {
        return removeCandidates(this.user, candidates);
      }
    });
}

function printCandidates(user, candidates) {
  var otherUserIds = candidates
    .map(function(room) {
      return getOtherUserId(user._id, room);
    })
    .filter(Boolean);

  return userService.findByIds(otherUserIds).then(function(users) {
    var userHash = collections.indexById(users);

    candidates.forEach(function(room) {
      var otherUserId = getOtherUserId(user._id, room);
      var otherUser = userHash[otherUserId];
      var username = otherUser && otherUser.username;
      console.log(username + '\t' + room.lastAccessTime);
    });
  });
}

function removeCandidates(user, candidates) {
  return Promise.map(
    candidates,
    function(room) {
      console.log('removing', room._id, user._id);
      return roomService.removeUserIdFromRoom(room, user._id).then(function() {
        var otherUserId = getOtherUserId(user._id, room);
        if (!otherUserId) return;

        return roomService.removeUserIdFromRoom(room, otherUserId);
      });
    },
    { concurrency: 1 }
  ).delay(5000);
}

findCandidates(opts.username, opts.dryRun).finally(function() {
  shutdown.shutdownGracefully();
});
