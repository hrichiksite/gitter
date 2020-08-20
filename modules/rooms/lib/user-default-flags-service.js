'use strict';

var _ = require('lodash');
var persistence = require('gitter-web-persistence');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var StatusError = require('statuserror');
var roomMembershipFlags = require('./room-membership-flags');
var User = persistence.User;
var Promise = require('bluebird');
var assert = require('assert');

var DEFAULT_USER_FLAGS = roomMembershipFlags.DEFAULT_USER_FLAGS;

/**
 * Returns the default flags for a user or
 * 404 StatusError if the user does not exist
 */
function getDefaultFlagsForUser(user) {
  return user.defaultFlags || DEFAULT_USER_FLAGS;
}

/**
 * Returns the default flags for a user or
 * 404 StatusError if the user does not exist
 */
function getDefaultFlagsForUserId(userId) {
  return User.findOne(
    {
      _id: userId
    },
    {
      _id: 0,
      defaultFlags: 1
    },
    {
      lean: true
    }
  )
    .exec()
    .then(function(user) {
      if (!user) throw new StatusError(404);

      if (!user.defaultFlags) return DEFAULT_USER_FLAGS;

      return user.defaultFlags;
    });
}

/**
 * If the user has their default set to mute,
 * make the one-to-one room annoucement
 */
function useOneToOneDefaultWhenMute(flags) {
  flags = roomMembershipFlags.removeDefaultFlag(flags);

  // Beware `===` has higher operator precedence than `&`!
  if ((flags & roomMembershipFlags.MODES.mute) === flags) {
    return roomMembershipFlags.DEFAULT_ONE_TO_ONE_FLAGS_WHEN_MUTE;
  } else {
    return flags;
  }
}

function getDefaultFlagsOneToOneForUserId(userId) {
  return getDefaultFlagsForUserId(userId).then(function(defaultFlags) {
    return useOneToOneDefaultWhenMute(defaultFlags);
  });
}

/**
 * Returns a hash default flags for some userIds
 */
function getDefaultFlagsForUserIds(userIds) {
  return mongooseUtils
    .findByIdsLean(User, userIds, {
      _id: 1,
      defaultFlags: 1
    })
    .then(function(users) {
      return _.transform(
        users,
        function(result, user) {
          result[user._id] = user.defaultFlags || DEFAULT_USER_FLAGS;
        },
        {}
      );
    });
}

function getDefaultOneToOneFlagsForUserIds(userIds) {
  return getDefaultFlagsForUserIds(userIds).then(function(resultHash) {
    Object.keys(resultHash).forEach(function(userId) {
      resultHash[userId] = useOneToOneDefaultWhenMute(resultHash[userId]);
    });
    return resultHash;
  });
}

/**
 * Set the default flags for a user. A fasley value
 * unsets the current default.
 */
function setDefaultFlagsForUserId(userId, flags) {
  assert(userId, 'Expected userId');

  if (flags) {
    return User.update({ _id: userId }, { $set: { defaultFlags: flags } }).exec();
  } else {
    // Unset the flags for this user
    return User.update({ _id: userId }, { $unset: { defaultFlags: true } }).exec();
  }
}

function getDefaultFlagDetailsForUserId(userId) {
  return getDefaultFlagsForUserId(userId).then(function(flags) {
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
      mobile: hash.mobile
    };
  });
}

module.exports = {
  getDefaultFlagsForUser: getDefaultFlagsForUser,
  getDefaultFlagsForUserId: getDefaultFlagsForUserId,
  getDefaultFlagsForUserIds: getDefaultFlagsForUserIds,
  setDefaultFlagsForUserId: Promise.method(setDefaultFlagsForUserId),
  getDefaultFlagDetailsForUserId: getDefaultFlagDetailsForUserId,

  getDefaultFlagsOneToOneForUserId: getDefaultFlagsOneToOneForUserId,
  getDefaultOneToOneFlagsForUserIds: getDefaultOneToOneFlagsForUserIds,
  testOnly: {
    useOneToOneDefaultWhenMute: useOneToOneDefaultWhenMute
  }
};
