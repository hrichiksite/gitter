'use strict';

var persistence = require('gitter-web-persistence');
var userService = require('gitter-web-users');
var collections = require('gitter-web-utils/lib/collections');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var roomMembershipService = require('./room-membership-service');

/**
 * Returns the URL a particular user would see if they wish to view a URL.
 * NB: this call has to query the db to get a user's username. Don't call it
 * inside a loop!
 */
function getUrlForTroupeForUserId(troupe, userId) {
  if (!troupe.oneToOne) {
    return Promise.resolve('/' + troupe.uri);
  }

  var otherTroupeUser = troupe.oneToOneUsers.filter(function(troupeUser) {
    return troupeUser.userId != userId;
  })[0];

  if (!otherTroupeUser)
    return Promise.reject(new Error('Unable to determine other user for troupe#' + troupe.id));

  return userService.findUsernameForUserId(otherTroupeUser.userId).then(function(username) {
    return username ? '/' + username : '/one-one/' + otherTroupeUser.userId; // TODO: this must go
  });
}
exports.getUrlForTroupeForUserId = getUrlForTroupeForUserId;

function getUrlOfFirstAccessibleRoom(troupeIds, userId) {
  if (!troupeIds.length) return Promise.resolve(null);

  return roomMembershipService
    .findUserMembershipInRooms(userId, troupeIds)
    .then(function(memberTroupeIds) {
      return persistence.Troupe.find(
        {
          _id: { $in: mongoUtils.asObjectIDs(memberTroupeIds) },
          status: { $ne: 'DELETED' }
        },
        {
          uri: 1,
          oneToOne: 1,
          oneToOneUsers: 1
        }
      ).exec();
    })
    .then(function(results) {
      var resultsHash = collections.indexById(results);
      for (var i = 0; i < troupeIds.length; i++) {
        var troupeId = troupeIds[i];
        var troupe = resultsHash[troupeId];

        if (troupe) {
          return getUrlForTroupeForUserId(troupe, userId);
        }
      }

      return null;
    });
}
exports.getUrlOfFirstAccessibleRoom = getUrlOfFirstAccessibleRoom;
