'use strict';

var _ = require('lodash');
var lazy = require('lazy.js');
var persistence = require('gitter-web-persistence');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const cursor = persistence.UserGroupFavourites.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

/**
 * Internal call
 * Based on gitter-web-rooms/lib/recent-room-core.js
 */
function addGroupAsFavouriteInLastPosition(userId, groupId) {
  return findFavouriteGroupsForUser(userId).then(function(userGroupFavourites) {
    var lastPosition =
      lazy(userGroupFavourites)
        .values()
        .concat(0)
        .max() + 1;

    var setOp = {};
    setOp['favs.' + groupId] = lastPosition;

    return persistence.UserGroupFavourites.update(
      { userId: userId },
      { $set: setOp },
      { upsert: true, new: true }
    )
      .exec()
      .thenReturn(lastPosition);
  });
}

/**
 * Internal call
 * Based on gitter-web-rooms/lib/recent-room-core.js
 */
function addGroupAsFavouriteInPosition(userId, groupId, position) {
  return findFavouriteGroupsForUser(userId).then(function(userGroupFavourites) {
    var values = lazy(userGroupFavourites)
      .pairs()
      .filter(function(a) {
        return a[1] >= position && a[0] !== groupId;
      })
      .sortBy(function(a) {
        return a[1];
      })
      .toArray();

    var next = position;
    // NB: used to be i = 1
    for (var i = 0; i < values.length; i++) {
      var item = values[i];

      if (item[1] > next) {
        /* Only increment those values before this one */
        values.splice(i, values.length);
        break;
      }
      /* This dude needs an increment */
      item[1]++;
      next = item[1];
    }

    var inc = lazy(values)
      .map(function(a) {
        return ['favs.' + a[0], 1];
      })
      .toObject();

    var set = {};
    set['favs.' + groupId] = position;

    var update = { $set: set };
    if (!_.isEmpty(inc)) update.$inc = inc; // Empty $inc is invalid

    return persistence.UserGroupFavourites.update({ userId: userId }, update, {
      upsert: true,
      new: true
    })
      .exec()
      .thenReturn(position);
  });
}

/**
 * Internal call
 * Based on gitter-web-rooms/lib/recent-room-core.js
 */
function clearFavourite(userId, groupId) {
  var setOp = {};
  setOp['favs.' + groupId] = 1;

  return persistence.UserGroupFavourites.update({ userId: userId }, { $unset: setOp }, {})
    .exec()
    .thenReturn(null);
}

function findFavouriteGroupsForUser(userId) {
  return persistence.UserGroupFavourites.findOne({ userId: userId }, { favs: 1 }, { lean: true })
    .exec()
    .then(function(userGroupFavourites) {
      if (!userGroupFavourites || !userGroupFavourites.favs) return {};

      return lazy(userGroupFavourites.favs)
        .pairs()
        .toObject();
    });
}

function updateFavourite(userId, groupId, favouritePosition) {
  if (favouritePosition) {
    /* Deal with legacy, or when the star button is toggled */
    if (favouritePosition === true) {
      return addGroupAsFavouriteInLastPosition(userId, groupId);
    } else {
      return addGroupAsFavouriteInPosition(userId, groupId, favouritePosition);
    }
  } else {
    // Unset the favourite
    return clearFavourite(userId, groupId);
  }
}

module.exports = {
  getCursorByUserId,
  findFavouriteGroupsForUser: findFavouriteGroupsForUser,
  updateFavourite: updateFavourite
};
