'use strict';

var Promise = require('bluebird');
var troupeUriMapper = require('./troupe-uri-mapper');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var persistence = require('gitter-web-persistence');
var assert = require('assert');
var appEvents = require('gitter-web-appevents');
var moment = require('moment');
var unreadItemsService = require('gitter-web-unread-items');
var recentRoomCore = require('./recent-room-core');
const roomFavouritesCore = require('./room-favourites-core');
var debug = require('debug')('gitter:app:recent-room-service');

exports.removeRecentRoomForUser = removeRecentRoomForUser;
exports.saveLastVisitedTroupeforUserId = saveLastVisitedTroupeforUserId;
exports.findInitialRoomUrlForUser = findInitialRoomUrlForUser;
exports.updateFavourite = updateFavourite;

/**
 * Called when the user removes a room from the left hand menu.
 */
function removeRecentRoomForUser(userId, roomId) {
  assert(mongoUtils.isLikeObjectId(userId));
  assert(mongoUtils.isLikeObjectId(roomId));

  return Promise.all([
    roomFavouritesCore.clearFavourite(userId, roomId),
    recentRoomCore.clearLastVisitedTroupeforUserId(userId, roomId),
    unreadItemsService.markAllChatsRead(userId, roomId)
  ]);
}

/**
 * Update the last visited troupe for the user, sending out appropriate events
 * Returns a promise of nothing
 */
function saveLastVisitedTroupeforUserId(userId, troupeId, options) {
  debug(
    'saveLastVisitedTroupeforUserId: userId=%s, troupeId=%s, options=%j',
    userId,
    troupeId,
    options
  );
  var lastAccessTime = (options && options.lastAccessTime) || new Date();

  return Promise.join(
    recentRoomCore.saveUserTroupeLastAccess(userId, troupeId, lastAccessTime),
    persistence.User.update({ _id: userId }, { $set: { lastTroupe: troupeId } }).exec(), // Update User
    function(didUpdate) {
      if (!didUpdate) return null;

      // NB: lastAccessTime should be a date but for some bizarre reason it's not
      // serializing properly
      if (!options || !options.skipFayeUpdate) {
        appEvents.dataChange2(
          '/user/' + userId + '/rooms',
          'patch',
          { id: troupeId, lastAccessTime: moment(lastAccessTime).toISOString() },
          'room'
        );
      }

      return null;
    }
  );
}

function findMostRecentRoomUrlForUser(userId) {
  return recentRoomCore.getTroupeLastAccessTimesForUser(userId).then(function(troupeAccessTimes) {
    var troupeIds = Object.keys(troupeAccessTimes);
    troupeIds.sort(function(a, b) {
      return troupeAccessTimes[b] - troupeAccessTimes[a]; // Reverse sort
    });

    return troupeUriMapper.getUrlOfFirstAccessibleRoom(troupeIds, userId);
  });
}

/* When a logged in user hits the root URL, find the best room to direct them to, or return null */
function findInitialRoomUrlForUser(user) {
  if (user.lastTroupe) {
    return troupeUriMapper
      .getUrlOfFirstAccessibleRoom([user.lastTroupe], user._id)
      .then(function(url) {
        if (url) return url;

        return findMostRecentRoomUrlForUser(user.id);
      });
  } else {
    return findMostRecentRoomUrlForUser(user.id);
  }
}

function updateFavourite(userId, troupeId, favouritePosition) {
  return roomFavouritesCore
    .updateFavourite(userId, troupeId, favouritePosition)
    .then(function(position) {
      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2(
        '/user/' + userId + '/rooms',
        'patch',
        { id: troupeId, favourite: position },
        'room'
      );
    });
}
