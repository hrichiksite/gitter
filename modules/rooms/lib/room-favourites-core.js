'use strict';

const lazy = require('lazy.js');
const _ = require('lodash');
const persistence = require('gitter-web-persistence');
const calculateFavouriteUpdates = require('./calculate-favourite-updates');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

const LEGACY_FAV_POSITION = 1000;

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const cursor = persistence.UserTroupeFavourites.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

function findFavouriteTroupesForUser(userId) {
  return persistence.UserTroupeFavourites.findOne({ userId: userId }, { favs: 1 }, { lean: true })
    .exec()
    .then(function(userTroupeFavourites) {
      if (!userTroupeFavourites || !userTroupeFavourites.favs) return {};

      return lazy(userTroupeFavourites.favs)
        .pairs()
        .map(function(a) {
          // Replace any legacy values with 1000
          if (a[1] === '1') a[1] = LEGACY_FAV_POSITION;
          return a;
        })
        .toObject();
    });
}

/**
 * Internal call
 */
function addTroupeAsFavouriteInLastPosition(userId, troupeId) {
  return findFavouriteTroupesForUser(userId).then(function(userTroupeFavourites) {
    var lastPosition =
      lazy(userTroupeFavourites)
        .values()
        .concat(0)
        .max() + 1;

    var setOp = {};
    setOp['favs.' + troupeId] = lastPosition;

    return persistence.UserTroupeFavourites.update(
      { userId: userId },
      { $set: setOp },
      { upsert: true, new: true }
    )
      .exec()
      .thenReturn(lastPosition);
  });
}

function addTroupeAsFavouriteInPosition(userId, troupeId, position) {
  return findFavouriteTroupesForUser(userId).then(function(userTroupeFavourites) {
    var values = lazy(userTroupeFavourites)
      .pairs()
      .value();

    const newValues = calculateFavouriteUpdates(troupeId, position, values);

    var inc = lazy(newValues)
      .map(function(a) {
        return ['favs.' + a[0], 1];
      })
      .toObject();

    var set = {};
    set['favs.' + troupeId] = position;

    var update = { $set: set };
    if (!_.isEmpty(inc)) update.$inc = inc; // Empty $inc is invalid

    return persistence.UserTroupeFavourites.update({ userId: userId }, update, {
      upsert: true,
      new: true
    })
      .exec()
      .thenReturn(position);
  });
}

function clearFavourite(userId, troupeId) {
  var setOp = {};
  setOp['favs.' + troupeId] = 1;

  return persistence.UserTroupeFavourites.update({ userId: userId }, { $unset: setOp }, {})
    .exec()
    .thenReturn(null);
}

function updateFavourite(userId, troupeId, favouritePosition) {
  if (favouritePosition) {
    /* Deal with legacy, or when the star button is toggled */
    if (favouritePosition === true) {
      return addTroupeAsFavouriteInLastPosition(userId, troupeId);
    } else {
      return addTroupeAsFavouriteInPosition(userId, troupeId, favouritePosition);
    }
  } else {
    // Unset the favourite
    return clearFavourite(userId, troupeId);
  }
}

module.exports = {
  getCursorByUserId,
  updateFavourite,
  clearFavourite,
  findFavouriteTroupesForUser
};
