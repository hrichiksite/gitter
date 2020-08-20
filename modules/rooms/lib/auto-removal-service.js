'use strict';

var Promise = require('bluebird');
var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger;
var recentRoomCore = require('./recent-room-core');
var unreadItemService = require('gitter-web-unread-items');
var roomMembershipService = require('./room-membership-service');

/**
 * Returns a list of users who could be lurked
 * [{ userId: ..., lastAccessTime: ... }]
 */
function findRemovalCandidates(roomId, options) {
  var minTimeInDays = options.minTimeInDays || 90;

  return roomMembershipService
    .findMembersForRoom(roomId)
    .then(function(userIds) {
      return recentRoomCore.findLastAccessTimesForUsersInRoom(roomId, userIds);
    })
    .then(function(lastAccessDates) {
      var cutoff = Date.now() - minTimeInDays * 86400000;
      var oldUserIds = Object.keys(lastAccessDates)
        .map(function(userId) {
          var lastAccess = lastAccessDates[userId];

          if (lastAccess && lastAccess < cutoff) {
            return userId;
          }
        })
        .filter(function(f) {
          return !!f;
        });

      return [oldUserIds, lastAccessDates];
    })
    .spread(function(oldUsersIds, lastAccessDates) {
      return oldUsersIds.map(function(userId) {
        return {
          userId: userId,
          lastAccessTime: lastAccessDates[userId]
        };
      });
    });
}
exports.findRemovalCandidates = findRemovalCandidates;

function bulkRemoveUsersFromRoom(roomId, groupId, userIds) {
  if (!userIds.length) return Promise.resolve();
  logger.info('Removing ' + userIds.length + ' users from ' + roomId);
  return roomMembershipService
    .removeRoomMembers(roomId, userIds, groupId)
    .then(function() {
      logger.info('Marking items as read');
      return Promise.map(
        userIds,
        function(userId) {
          return unreadItemService.ensureAllItemsRead(userId, roomId);
        },
        { concurrency: 5 }
      );
    })
    .then(function() {
      userIds.forEach(function(userId) {
        stats.event('auto_removed_room', {
          userId: userId,
          troupeId: roomId,
          auto: true
        });
      });
    });
}
exports.bulkRemoveUsersFromRoom = bulkRemoveUsersFromRoom;

/**
 * Auto remove users in a room
 */
function autoRemoveInactiveUsers(roomId, groupId, options) {
  return findRemovalCandidates(roomId, options).then(function(candidates) {
    if (!candidates.length) return [];

    var userIdsForRemoval = candidates.map(function(candidate) {
      return candidate.userId;
    });

    return bulkRemoveUsersFromRoom(roomId, groupId, userIdsForRemoval).thenReturn(candidates);
  });
}
exports.autoRemoveInactiveUsers = autoRemoveInactiveUsers;
