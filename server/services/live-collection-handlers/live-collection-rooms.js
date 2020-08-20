'use strict';

var Promise = require('bluebird');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var presenceService = require('gitter-web-presence');
var _ = require('lodash');

function getUserDistribution(troupeId) {
  return roomMembershipService.findMembersForRoom(troupeId).then(function(userIds) {
    if (!userIds.length) return [];

    return presenceService.categorizeUsersByOnlineStatus(userIds).then(function(online) {
      return userIds.filter(function(userId) {
        return !!online[userId];
      });
    });
  });
}

function serializeRoomToUsers(userIds, operation, troupe) {
  if (!userIds.length) return Promise.resolve();

  if (troupe.oneToOne) {
    // Because the troupe needs customized per-user....
    return serializeOneToOneRoomToUsers(userIds, operation, troupe);
  }

  var strategy = new restSerializer.TroupeStrategy();
  return restSerializer.serializeObject(troupe, strategy).then(function(serializedTroupe) {
    appEvents.dataChange2('/rooms/' + troupe._id, operation, serializedTroupe, 'room');

    userIds.forEach(function(userId) {
      appEvents.dataChange2('/user/' + userId + '/rooms', operation, serializedTroupe, 'room');
    });
  });
}

/* Note: oneToOnes do not serialize to /rooms/:roomId since each user gets a different representation */
function serializeOneToOneRoomToUsers(userIds, operation, troupe) {
  /* Perform the serialization for each user */

  return Promise.map(userIds, function(userId) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: userId });

    return restSerializer.serializeObject(troupe, strategy).then(function(serializedTroupe) {
      appEvents.dataChange2('/user/' + userId + '/rooms', operation, serializedTroupe, 'room');
    });
  });
}

module.exports = {
  create: function(troupe, initialUserIds) {
    /* initialUserIds is used when the room has just been created  */
    /* and we know who the users in the room are                   */
    if (initialUserIds) {
      return serializeRoomToUsers(initialUserIds, 'create', troupe);
    }

    return getUserDistribution(troupe._id).then(function(userIds) {
      return serializeRoomToUsers(userIds, 'create', troupe);
    });
  },

  update: function(troupe) {
    return getUserDistribution(troupe._id).then(function(userIds) {
      return serializeRoomToUsers(userIds, 'update', troupe);
    });
  },

  patch: function(troupeId, patch) {
    var patchMessage = _.extend({}, patch, { id: troupeId });
    appEvents.dataChange2('/rooms/' + troupeId, 'patch', patchMessage, 'room');

    return getUserDistribution(troupeId).then(function(userIds) {
      if (!userIds.length) return;

      userIds.forEach(function(userId) {
        var url = '/user/' + userId + '/rooms';
        appEvents.dataChange2(url, 'patch', patchMessage, 'room');
      });
    });
  },

  remove: function(model) {
    return this.removeId(model.id);
  },

  removeId: function(troupeId) {
    appEvents.dataChange2('/rooms/' + troupeId, 'remove', { id: troupeId }, 'room');

    return getUserDistribution(troupeId).then(function(userIds) {
      if (!userIds.length) return;

      userIds.forEach(function(userId) {
        var url = '/user/' + userId + '/rooms';
        appEvents.dataChange2(url, 'remove', { id: troupeId }, 'room');
      });
    });
  }
};
