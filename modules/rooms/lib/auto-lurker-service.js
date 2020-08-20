'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var recentRoomCore = require('./recent-room-core');
var unreadItemService = require('gitter-web-unread-items');
var Promise = require('bluebird');
var roomMembershipService = require('./room-membership-service');

/* CODEDEBT: https://github.com/troupe/gitter-webapp/issues/991 */

/**
 * Returns a list of users who could be lurked
 * [{ userId: ..., lastAccessTime: ..., lurk: ..., notificationSettings: ... }]
 */
function findLurkCandidates(troupe, options) {
  var troupeId = troupe._id;
  return roomMembershipService
    .findMembersForRoomWithFlags(troupeId, {
      notify: true,
      activity: true
    })
    .then(function(userIds) {
      var minTimeInDays = options.minTimeInDays || 14;

      return recentRoomCore
        .findLastAccessTimesForUsersInRoom(troupeId, userIds)
        .then(function(lastAccessDates) {
          var cutoff = Date.now() - minTimeInDays * 86400000;

          return Object.keys(lastAccessDates)
            .map(function(userId) {
              var lastAccess = lastAccessDates[userId];

              if (lastAccess && lastAccess < cutoff) {
                return {
                  userId: userId,
                  lastAccessTime: lastAccessDates[userId]
                };
              }
            })
            .filter(function(f) {
              return !!f;
            });
        });
    });
}

exports.findLurkCandidates = findLurkCandidates;

/**
 * Bulk lurk users without putting undue strain on mongodb
 */
function bulkLurkUsers(troupeId, userIds) {
  return roomMembershipService
    .setMembershipModeForUsersInRoom(troupeId, userIds, 'mute', true)
    .then(function() {
      return Promise.map(
        userIds,
        function(userId) {
          return unreadItemService.ensureAllItemsRead(userId, troupeId);
        },
        { concurrency: 5 }
      );
    })
    .then(function() {
      userIds.forEach(function(userId) {
        stats.event('lurk_room', {
          userId: userId,
          troupeId: troupeId,
          lurking: true,
          auto: true
        });
      });
    });

  // Odd, user not found
  // if(!count) return;

  // Don't send updates for now
  //appEvents.userTroupeLurkModeChange({ userId: userId, troupeId: troupeId, lurk: lurk });
  // TODO: in future get rid of this but this collection is used by the native clients
  //appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', { id: troupeId, lurk: lurk });

  // Delete all the chats in Redis for this person too
}
exports.bulkLurkUsers = bulkLurkUsers;

/**
 * Auto lurk users in a room
 */
function autoLurkInactiveUsers(troupe, options) {
  return findLurkCandidates(troupe, options).then(function(candidates) {
    if (!candidates.length) return [];

    return bulkLurkUsers(
      troupe.id,
      candidates.map(function(u) {
        return u.userId;
      })
    ).return(candidates);
  });
}
exports.autoLurkInactiveUsers = autoLurkInactiveUsers;
