'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var _ = require('lodash');
var debug = require('debug')('gitter:app:recent-room-core');

/* const */
var DEFAULT_LAST_ACCESS_TIME = new Date('2015-07-01T00:00:00Z');

function clearLastVisitedTroupeforUserId(userId, troupeId) {
  debug('recent-rooms: Clearing last visited Troupe for user: %s to troupe %s', userId, troupeId);

  var setOp = {};
  setOp['troupes.' + troupeId] = 1;

  // Update UserTroupeLastAccess
  return persistence.UserTroupeLastAccess.update(
    { userId: userId },
    { $unset: setOp },
    { upsert: true, new: true }
  ).exec();
}

/**
 * Returns Promise of true if an update actually happened
 */
function saveUserTroupeLastAccess(userId, troupeId, lastAccessTime) {
  if (lastAccessTime) {
    if (!(lastAccessTime instanceof Date)) {
      lastAccessTime = new Date(lastAccessTime);
    }
  } else {
    lastAccessTime = new Date();
  }

  var maxOp = {};
  maxOp['troupes.' + troupeId] = lastAccessTime;
  maxOp['last.' + troupeId] = lastAccessTime;

  return persistence.UserTroupeLastAccess.update(
    { userId: userId },
    { $max: maxOp },
    { upsert: true }
  )
    .lean(true)
    .exec()
    .then(function(result) {
      return !!(result.nModified || (result.upserted && result.upserted.length));
    });
}

function getTroupeLastAccessTimesForUserExcludingHidden(userId) {
  return persistence.UserTroupeLastAccess.findOne(
    { userId: userId },
    { _id: 0, troupes: 1 },
    { lean: true }
  )
    .exec()
    .then(function(userTroupeLastAccess) {
      if (!userTroupeLastAccess || !userTroupeLastAccess.troupes) return {};
      return userTroupeLastAccess.troupes;
    });
}

/**
 * Get the last access times for a user.
 * @param userId user we're getting the last access time for
 * @return promise of a hash of { troupeId1: accessDate, troupeId2: accessDate ... }
 */
function getTroupeLastAccessTimesForUser(userId) {
  return persistence.UserTroupeLastAccess.findOne(
    { userId: userId },
    { _id: 0, last: 1, troupes: 1 },
    { lean: true }
  )
    .exec()
    .then(function(userTroupeLastAccess) {
      if (!userTroupeLastAccess) return {};

      // Merge the results from `last` and `troupe`, giving priority to
      // the values from last
      return _.extend({}, userTroupeLastAccess.troupes, userTroupeLastAccess.last);
    });
}

/**
 * Returns a hash of the last access times for an array of userIds for a given room.
 * If the user has never accessed the room, the value will represent the
 * date the user was added to the room, or the date this feature was deployed
 * as a default ~1 July 2015.
 */
function findLastAccessTimesForUsersInRoom(roomId, userIds) {
  if (!userIds.length) return Promise.resolve({});

  var troupesKey = 'troupes.' + roomId;
  var lastKey = 'last.' + roomId;
  var addedKey = 'added.' + roomId;

  var orClause = [{}, {}, {}];
  orClause[0][troupesKey] = { $exists: true };
  orClause[1][lastKey] = { $exists: true };
  orClause[2][addedKey] = { $exists: true };

  var query = { userId: { $in: userIds }, $or: orClause };

  var select = { userId: 1, _id: 0 };
  select[troupesKey] = 1;
  select[lastKey] = 1;
  select[addedKey] = 1;

  return persistence.UserTroupeLastAccess.find(query, select, { lean: true })
    .exec()
    .then(function(lastAccessTimes) {
      var lastAccessTimesHash = lastAccessTimes.reduce(function(memo, item) {
        // Use the last date by default, falling back to the troupes hash for
        // backwards compatibility
        memo[item.userId] =
          (item.last && item.last[roomId]) ||
          (item.troupes && item.troupes[roomId]) ||
          (item.added && item.added[roomId]);
        return memo;
      }, {});

      return userIds.reduce(function(memo, userId) {
        memo[userId] = lastAccessTimesHash[userId] || DEFAULT_LAST_ACCESS_TIME;
        return memo;
      }, {});
    });
}

module.exports = {
  saveUserTroupeLastAccess,
  getTroupeLastAccessTimesForUserExcludingHidden,
  getTroupeLastAccessTimesForUser,
  findLastAccessTimesForUsersInRoom,
  clearLastVisitedTroupeforUserId
};
