'use strict';

var env = require('gitter-web-env');
var errorReporter = env.errorReporter;
var persistence = require('gitter-web-persistence');
var TroupeUser = persistence.TroupeUser;
var Troupe = persistence.Troupe;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var assert = require('assert');
var debug = require('debug')('gitter:app:room-membership-service');
var recentRoomCore = require('./recent-room-core');
var roomMembershipEvents = new EventEmitter();
var _ = require('lodash');
var roomMembershipFlags = require('./room-membership-flags');
var groupMembershipDeltaService = require('gitter-web-groups/lib/group-membership-delta-service');
var removedUsers = require('./room-removed-user-core');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

/**
 * Returns the rooms the user is in
 */
function findRoomIdsForUser(userId) {
  debug('findRoomIdsForUser(%s)', userId);
  assert(userId);

  return TroupeUser.distinct('troupeId', { userId: userId }).exec();
}

/**
 * Returns the rooms the user is in, with lurk status
 */
function findRoomIdsForUserWithLurk(userId) {
  debug('findRoomIdsForUserWithLurk(%s)', userId);

  assert(userId);

  return TroupeUser.find({ userId: userId }, { _id: 0, troupeId: 1, flags: 1 }, { lean: true })
    .exec()
    .then(function(results) {
      return _.reduce(
        results,
        function(memo, troupeUser) {
          memo[troupeUser.troupeId] = roomMembershipFlags.getLurkForFlags(troupeUser.flags);
          return memo;
        },
        {}
      );
    });
}

/**
 * Returns the rooms the user is in, with lurk status
 */
function findLurkingRoomIdsForUserId(userId) {
  assert(userId);

  return TroupeUser.distinct('troupeId', {
    userId: userId,
    flags: queryForToggles({ activity: true })
  }).exec();
}

/**
 * Returns true iff the user is a member of the room
 */
async function checkRoomMembership(troupeId, userId) {
  assert(troupeId);
  assert(userId);

  const count = await TroupeUser.count({ troupeId: troupeId, userId: userId }).exec();
  debug(`checkRoomMembership(troupeId=${troupeId} userId=${userId}) -> ${count}`);
  return count > 0;
}

/**
 * Given a set of rooms, will return a subset in which the user
 * is a member
 */
function findUserMembershipInRooms(userId, troupeIds) {
  assert(userId);
  if (!troupeIds.length) return Promise.resolve([]);

  if (troupeIds.length === 1) {
    // Optimise for single troupeIds, which happens a lot
    return checkRoomMembership(troupeIds[0], userId).then(function(isMember) {
      return isMember ? troupeIds : [];
    });
  }

  return TroupeUser.distinct('troupeId', {
    troupeId: { $in: mongoUtils.asObjectIDs(troupeIds) },
    userId: userId
  }).exec();
}

/**
 * Given a set of users, will return a subset of those users
 * who are in the room
 */
function findMembershipForUsersInRoom(troupeId, userIds) {
  assert(troupeId);
  if (!userIds.length) return Promise.resolve([]);

  return TroupeUser.distinct('userId', {
    userId: { $in: mongoUtils.asObjectIDs(userIds) },
    troupeId: troupeId
  }).exec();
}

/**
 * Find the userIds of all the members of a room.
 */
function findMembersForRoom(troupeId, options) {
  assert(troupeId);

  var skip = options && options.skip;
  var limit = options && options.limit;

  if (!skip && !limit) {
    // Short-cut if we don't want to use skip and limit
    return TroupeUser.distinct('userId', { troupeId: troupeId }).exec();
  }

  var query = TroupeUser.find({ troupeId: troupeId }, { _id: 0, userId: 1 }, { lean: true });
  if (options && options.skip) {
    query.skip(options.skip);
  }

  if (options && options.limit) {
    query.limit(options.limit);
  }

  return query.exec().then(function(results) {
    return _.map(results, function(troupeUser) {
      return troupeUser.userId;
    });
  });
}

/**
 * Find the userIds of all the members of a room.
 */
function countMembersInRoom(troupeId) {
  assert(troupeId);

  return TroupeUser.count({ troupeId: troupeId }).exec();
}

/**
 * Returns a hash of users in the room their lurk status as the value
 */
function findMembersForRoomWithLurk(troupeId) {
  assert(troupeId);

  return TroupeUser.find({ troupeId: troupeId }, { _id: 0, userId: 1, flags: 1 }, { lean: true })
    .exec()
    .then(function(results) {
      return _.reduce(
        results,
        function(memo, v) {
          memo[v.userId] = roomMembershipFlags.getLurkForFlags(v.flags);
          return memo;
        },
        {}
      );
    });
}

/**
 * Add a single user to a room. Returns true if the
 * user was added, false if they were already in the
 * room
 */
function addRoomMember(troupeId, userId, flags, groupId) {
  debug('Adding member %s to room %s', userId, troupeId);

  assert(troupeId, 'Expected troupeId parameter');
  assert(userId, 'Expected userId parameter');
  assert(flags, 'Expected flags parameter');

  return (groupId
    ? groupMembershipDeltaService.isUserInGroup(userId, groupId)
    : Promise.resolve(null)
  )
    .bind({
      alreadyInGroup: null
    })
    .then(function(alreadyInGroup) {
      this.alreadyInGroup = alreadyInGroup;
      debug('Is member %s already in group %s? %s', userId, groupId, alreadyInGroup);

      return TroupeUser.findOneAndUpdate(
        {
          troupeId: troupeId,
          userId: userId
        },
        {
          $setOnInsert: {
            troupeId: troupeId,
            userId: userId,
            flags: flags
          }
        },
        { upsert: true, new: false }
      ).exec();
    })
    .then(function(previous) {
      var added = !previous;

      if (!added) {
        debug('Member %s is already in room %s', userId, troupeId);
        return false;
      }

      if (groupId && !this.alreadyInGroup) {
        roomMembershipEvents.emit('group.members.added', groupId, [userId]);
      }

      // Set the last access time for the user to now if the user
      // has just been added to the room
      return recentRoomCore
        .saveUserTroupeLastAccess(userId, troupeId)
        .then(function() {
          roomMembershipEvents.emit('members.added', troupeId, [userId]);

          return incrementTroupeUserCount(troupeId, 1);
        })
        .thenReturn(added);
    });
}

/**
 * Remove a single person from a room. Returns
 * true if the user was deleted, false if they
 * were not in the room
 */
function removeRoomMember(troupeId, userId, groupId) {
  debug('Removing member %s from room %s', userId, troupeId);

  assert(troupeId);
  assert(userId);

  return (groupId
    ? groupMembershipDeltaService.isUserInGroup(userId, groupId, troupeId)
    : Promise.resolve(false)
  )
    .bind({
      hasOtherMembershipsInGroup: null
    })
    .then(function(hasOtherMembershipsInGroup) {
      this.hasOtherMembershipsInGroup = hasOtherMembershipsInGroup;

      return TroupeUser.findOneAndRemove({
        troupeId: troupeId,
        userId: userId
      }).exec();
    })
    .then(function(existing) {
      var removed = !!existing;

      if (!removed) return false;

      if (groupId && !this.hasOtherMembershipsInGroup) {
        roomMembershipEvents.emit('group.members.removed', groupId, [userId]);
      }

      roomMembershipEvents.emit('members.removed', troupeId, [userId]);

      // Async record the remove user
      removedUsers.addRemovedUser(troupeId, userId).catch(function(err) {
        errorReporter(
          err,
          { troupeId: troupeId, userId: userId },
          { module: 'room-membership-service' }
        );
      });

      return incrementTroupeUserCount(troupeId, -1).thenReturn(true);
    });
}

/**
 * Remove users from a room
 */
function removeRoomMembers(troupeId, userIds, groupId) {
  debug('Removing %s members from room %s', userIds.length, troupeId);

  assert(troupeId);
  if (!userIds.length) return Promise.resolve();

  userIds.forEach(function(userId) {
    assert(userId);
  });

  return (groupId
    ? groupMembershipDeltaService.checkUsersInGroup(groupId, userIds, troupeId)
    : Promise.resolve({})
  )
    .bind({
      groupMembership: null
    })
    .then(function(groupMembership) {
      this.groupMembership = groupMembership;

      return TroupeUser.remove({
        troupeId: troupeId,
        userId: { $in: mongoUtils.asObjectIDs(userIds) }
      }).exec();
    })
    .then(function() {
      // Unfortunately we have no way of knowing which of the users
      // were actually removed and which were already out of the collection
      // as we have no transactions.
      //
      // So we assume that ALL the users were actually removed
      roomMembershipEvents.emit('members.removed', troupeId, userIds);

      if (groupId) {
        var groupMembership = this.groupMembership;

        var usersNoLongerInGroup = _.filter(userIds, function(userId) {
          return !groupMembership[userId];
        });

        if (usersNoLongerInGroup.length) {
          roomMembershipEvents.emit('group.members.removed', groupId, usersNoLongerInGroup);
        }
      }

      // Async record the remove user
      removedUsers.addRemovedUsers(troupeId, userIds).catch(function(err) {
        errorReporter(
          err,
          { troupeId: troupeId, userIds: userIds },
          { module: 'room-membership-service' }
        );
      });

      return resetTroupeUserCount(troupeId);
    });
}

/**
 * Returns a list of all room members for an array of rooms
 */
function findAllMembersForRooms(troupeIds) {
  if (!troupeIds.length) return Promise.resolve([]);
  troupeIds.forEach(function(troupeIds) {
    assert(troupeIds);
  });

  return TroupeUser.distinct('userId', {
    troupeId: { $in: mongoUtils.asObjectIDs(troupeIds) }
  }).exec();
}

/**
 * Fetch the membership of multiple rooms, returns
 * a hash keyed by the troupeId, with a userId array
 * as the value
 */
function findMembersForRoomMulti(troupeIds, options) {
  options = options || {};
  options.read = options.read || mongoReadPrefs.secondaryPreferred;

  if (!troupeIds.length) return Promise.resolve({});
  troupeIds.forEach(function(troupeIds) {
    assert(troupeIds);
  });

  return TroupeUser.find(
    { troupeId: { $in: mongoUtils.asObjectIDs(troupeIds) } },
    { _id: 0, troupeId: 1, userId: 1 }
  )
    .read(options.read)
    .exec()
    .then(function(troupeUsers) {
      return _.reduce(
        troupeUsers,
        function(memo, troupeUser) {
          var troupeId = troupeUser.troupeId;
          var userId = troupeUser.userId;

          if (memo[troupeId]) {
            memo[troupeId].push(userId);
          } else {
            memo[troupeId] = [userId];
          }

          return memo;
        },
        {}
      );
    });
}

/**
 * Returns the lurk status of a single user
 * Returns true when lurking, false when not, null when user is not found
 */
function getMemberLurkStatus(troupeId, userId) {
  return TroupeUser.findOne(
    { troupeId: troupeId, userId: userId },
    { flags: 1, _id: 0 },
    { lean: true }
  )
    .exec()
    .then(function(troupeUser) {
      if (!troupeUser) return null;
      return roomMembershipFlags.getLurkForFlags(troupeUser.flags);
    });
}

/**
 * Update the userCount value for a room
 */
function incrementTroupeUserCount(troupeId, incrementValue) {
  return Troupe.update({ _id: troupeId }, { $inc: { userCount: incrementValue } }).exec();
}

function resetTroupeUserCount(troupeId) {
  return countMembersInRoom(troupeId).then(function(count) {
    return Troupe.update({ _id: troupeId }, { $set: { userCount: count } }).exec();
  });
}

var getMembershipMode = Promise.method(function(userId, troupeId, strict) {
  return TroupeUser.findOne(
    { troupeId: troupeId, userId: userId },
    { flags: 1, _id: 0 },
    { lean: true }
  )
    .exec()
    .then(function(troupeUser) {
      if (!troupeUser) return null;

      return roomMembershipFlags.getModeFromFlags(troupeUser.flags, strict);
    });
});

var getMembershipDetails = Promise.method(function(userId, troupeId) {
  return TroupeUser.findOne(
    { troupeId: troupeId, userId: userId },
    { flags: 1, _id: 0 },
    { lean: true }
  )
    .exec()
    .then(function(troupeUser) {
      if (!troupeUser) return null;
      var flags = troupeUser.flags;
      var mode = roomMembershipFlags.getModeFromFlags(flags);
      var hash = roomMembershipFlags.flagsToHash(flags);

      return {
        mode: mode,
        lurk: roomMembershipFlags.getLurkForFlags(flags),
        flags: flags,

        unread: hash.unread,
        activity: hash.activity,
        mention: hash.mention,
        announcement: hash.announcement,
        desktop: hash.desktop,
        mobile: hash.mobile,
        default: hash.default
      };
    });
});

var setMembershipFlags = Promise.method(function(userId, troupeId, flags) {
  debug('setMembershipFlags userId=%s, troupeId=%s, flags=%s', flags);
  return TroupeUser.findOneAndUpdate(
    {
      troupeId: troupeId,
      userId: userId
    },
    roomMembershipFlags.getUpdateForFlags(flags),
    {
      new: false
    }
  )
    .exec()
    .then(function(oldTroupeUser) {
      if (!oldTroupeUser) return false;

      var valueIsLurking = roomMembershipFlags.getLurkForFlags(flags);
      var oldLurking = roomMembershipFlags.getLurkForFlags(oldTroupeUser.flags);
      var changed = oldLurking !== valueIsLurking;

      if (changed) {
        roomMembershipEvents.emit('members.lurk.change', troupeId, [userId], valueIsLurking);
      }

      return changed;
    });
});

var setMembershipMode = Promise.method(function(userId, troupeId, value, isDefault) {
  debug('setMembershipMode userId=%s, troupeId=%s, value=%s', userId, troupeId, value);
  return TroupeUser.findOneAndUpdate(
    {
      troupeId: troupeId,
      userId: userId
    },
    roomMembershipFlags.getUpdateForMode(value, isDefault),
    {
      new: false
    }
  )
    .exec()
    .then(function(oldTroupeUser) {
      if (!oldTroupeUser) return false;

      var valueIsLurking = roomMembershipFlags.getLurkForMode(value);
      var oldLurkValue = roomMembershipFlags.getLurkForFlags(oldTroupeUser.flags);
      var changed = oldLurkValue !== valueIsLurking;

      if (changed) {
        roomMembershipEvents.emit('members.lurk.change', troupeId, [userId], valueIsLurking);
      }

      return changed;
    });
});

var setMembershipModeForUsersInRoom = Promise.method(function(troupeId, userIds, value, isDefault) {
  return TroupeUser.update(
    {
      troupeId: troupeId,
      userId: { $in: mongoUtils.asObjectIDs(userIds) }
    },
    roomMembershipFlags.getUpdateForMode(value, isDefault),
    {
      multi: true
    }
  )
    .exec()
    .then(function() {
      var valueIsLurking = roomMembershipFlags.getLurkForMode(value);

      // Unfortunately we have no way of knowing which of the users
      // were actually removed and which were already out of the collection
      // as we have no transactions.

      roomMembershipEvents.emit('members.lurk.change', troupeId, userIds, valueIsLurking);
    });
});

var findMembershipModeForUsersInRoom = Promise.method(function(troupeId, userIds, strict) {
  return TroupeUser.find(
    {
      troupeId: troupeId,
      userId: { $in: mongoUtils.asObjectIDs(userIds) }
    },
    {
      userId: 1,
      flags: 1,
      _id: 0
    },
    {
      lean: true
    }
  )
    .exec()
    .then(function(troupeUsers) {
      return _.reduce(
        troupeUsers,
        function(memo, troupeUser) {
          memo[troupeUser.userId] = roomMembershipFlags.getModeFromFlags(troupeUser.flags, strict);
          return memo;
        },
        {}
      );
    });
});

/**
 * Given a room, returns users in that should get some form of notification
 */
function findMembersForRoomForNotify(troupeId, fromUserId, isAnnouncement, mentionUserIds) {
  var requiredBits, query;
  var hasMentions = mentionUserIds && mentionUserIds.length;

  if (isAnnouncement) {
    requiredBits = [
      roomMembershipFlags.FLAG_POS_NOTIFY_UNREAD,
      roomMembershipFlags.FLAG_POS_NOTIFY_ACTIVITY,
      roomMembershipFlags.FLAG_POS_NOTIFY_ANNOUNCEMENT,
      roomMembershipFlags.FLAG_POS_NOTIFY_DESKTOP,
      roomMembershipFlags.FLAG_POS_NOTIFY_MOBILE
    ];
  } else {
    requiredBits = [
      roomMembershipFlags.FLAG_POS_NOTIFY_UNREAD,
      roomMembershipFlags.FLAG_POS_NOTIFY_ACTIVITY,
      roomMembershipFlags.FLAG_POS_NOTIFY_DESKTOP,
      roomMembershipFlags.FLAG_POS_NOTIFY_MOBILE
    ];
  }

  if (hasMentions) {
    /* If there are mentions, we need to include mention users */
    query = {
      troupeId: troupeId,
      userId: { $ne: fromUserId },
      $or: [
        { flags: { $bitsAnySet: requiredBits } },
        {
          userId: { $in: mongoUtils.asObjectIDs(mentionUserIds) },
          flags: { $bitsAnySet: [roomMembershipFlags.FLAG_POS_NOTIFY_MENTION] }
        }
      ]
    };
  } else {
    /* No mentions? Just include the users for notify and possible also announcements */
    query = {
      troupeId: troupeId,
      userId: { $ne: fromUserId },
      flags: {
        $bitsAnySet: requiredBits
      }
    };
  }

  return TroupeUser.find(
    query,
    {
      userId: 1,
      flags: 1,
      _id: 0
    },
    {
      lean: true
    }
  ).exec();
}

function queryForToggles(flagToggles) {
  var setBits = 0;
  var clearBits = 0;

  function addToggle(field, bitPosition) {
    var value = flagToggles[field];
    if (value === false) {
      clearBits = clearBits | (1 << bitPosition);
    } else if (value === true) {
      setBits = setBits | (1 << bitPosition);
    }
  }

  addToggle('notify', roomMembershipFlags.FLAG_POS_NOTIFY_MENTION);
  addToggle('activity', roomMembershipFlags.FLAG_POS_NOTIFY_ACTIVITY);
  addToggle('mention', roomMembershipFlags.FLAG_POS_NOTIFY_MENTION);
  addToggle('announcement', roomMembershipFlags.FLAG_POS_NOTIFY_ANNOUNCEMENT);
  addToggle('default', roomMembershipFlags.FLAG_POS_NOTIFY_DEFAULT);
  addToggle('desktop', roomMembershipFlags.FLAG_POS_NOTIFY_DESKTOP);
  addToggle('mobile', roomMembershipFlags.FLAG_POS_NOTIFY_MOBILE);

  var allRequired = flagToggles.all === true;

  if (!setBits && !clearBits) {
    return;
  }

  var query = {};

  if (setBits) {
    if (allRequired) {
      query.$bitsAllSet = setBits;
    } else {
      query.$bitsAnySet = setBits;
    }
  }

  if (clearBits) {
    if (allRequired) {
      query.$bitsAllClear = clearBits;
    } else {
      query.$bitsAnyClear = clearBits;
    }
  }

  return query;
}

function findMembersForRoomWithFlags(troupeId, flagToggles) {
  return TroupeUser.distinct('userId', {
    troupeId: troupeId,
    flags: queryForToggles(flagToggles)
  }).exec();
}

function updateRoomMembershipFlagsForUser(userId, newFlags, overrideAll) {
  var query = {
    userId: userId
  };

  if (!overrideAll) {
    query.flags = queryForToggles({ default: true, all: true });
  }

  var newDefaultIsLurking = !!roomMembershipFlags.getLurkForFlags(newFlags);

  return TroupeUser.find(query, { _id: 0, troupeId: 1, flags: 1 })
    .lean()
    .exec()
    .bind({ roomsWithLurkChange: undefined })
    .then(function(troupeUsers) {
      // Not atomic!
      this.roomsWithLurkChange = troupeUsers
        .filter(function(troupeUser) {
          var isCurrentlyLurking = !!troupeUser.lurk;

          return isCurrentlyLurking !== newDefaultIsLurking;
        })
        .map(function(troupeUser) {
          return troupeUser.troupeId;
        });

      var troupeIdsForUpdate = troupeUsers.map(function(troupeUser) {
        return troupeUser.troupeId;
      });

      return TroupeUser.update(
        {
          userId: userId,
          troupeId: { $in: troupeIdsForUpdate }
        },
        {
          $set: {
            flags: newFlags
          }
        },
        {
          multi: true
        }
      );
    })
    .then(function(result) {
      debug('Updated %s rooms to new default', result.nModified);
      this.roomsWithLurkChange.forEach(function(troupeId) {
        roomMembershipEvents.emit('members.lurk.change', troupeId, [userId], newDefaultIsLurking);
      });

      return null;
    });
}

function findRoomIdsForUserMatchingQuery(userId, query) {
  var matchTerms = Object.keys(query).reduce(function(memo, key) {
    var value = query[key];
    memo['troupe.' + key] = value;
    return memo;
  }, {});

  return TroupeUser.aggregate([
    {
      $match: {
        userId: mongoUtils.asObjectID(userId)
      }
    },
    {
      $project: {
        _id: '$troupeId'
      }
    },
    {
      $lookup: {
        from: 'troupes',
        localField: '_id',
        foreignField: '_id',
        as: 'troupe'
      }
    },
    {
      $unwind: '$troupe'
    },
    {
      $match: matchTerms
    },
    {
      $project: {
        _id: 1
      }
    }
  ]).then(function(docs) {
    return _.map(docs, function(doc) {
      return doc._id;
    });
  });
}

function findPrivateRoomIdsForUser(userId) {
  return findRoomIdsForUserMatchingQuery(userId, { 'sd.public': false });
}

/* Exports */
exports.findRoomIdsForUser = findRoomIdsForUser;
exports.findRoomIdsForUserWithLurk = findRoomIdsForUserWithLurk;
exports.findLurkingRoomIdsForUserId = findLurkingRoomIdsForUserId;
exports.checkRoomMembership = checkRoomMembership;
exports.findUserMembershipInRooms = findUserMembershipInRooms;
exports.findMembershipForUsersInRoom = findMembershipForUsersInRoom;

exports.findMembersForRoom = findMembersForRoom;
exports.countMembersInRoom = countMembersInRoom;
exports.findMembersForRoomWithLurk = findMembersForRoomWithLurk;
exports.addRoomMember = addRoomMember;
exports.removeRoomMember = removeRoomMember;
exports.removeRoomMembers = removeRoomMembers;
exports.findAllMembersForRooms = findAllMembersForRooms;
exports.findMembersForRoomMulti = findMembersForRoomMulti;

exports.getMemberLurkStatus = getMemberLurkStatus;

exports.getMembershipMode = getMembershipMode;
exports.getMembershipDetails = getMembershipDetails;
exports.setMembershipFlags = setMembershipFlags;
exports.setMembershipMode = setMembershipMode;
exports.setMembershipModeForUsersInRoom = setMembershipModeForUsersInRoom;
exports.findMembershipModeForUsersInRoom = findMembershipModeForUsersInRoom;
exports.findMembersForRoomForNotify = findMembersForRoomForNotify;
exports.findMembersForRoomWithFlags = findMembersForRoomWithFlags;
exports.updateRoomMembershipFlagsForUser = updateRoomMembershipFlagsForUser;
exports.findPrivateRoomIdsForUser = findPrivateRoomIdsForUser;

/* Event emitter */
exports.events = roomMembershipEvents;
