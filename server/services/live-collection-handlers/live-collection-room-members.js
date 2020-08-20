'use strict';

var Promise = require('bluebird');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var userTypeaheadElastic = require('../typeaheads/user-typeahead-elastic');
var debug = require('debug')('gitter:app:live-collection-room-members');

function notifyGroupRoomOfAddedUsers(room, userIds) {
  /* No point in notifing large rooms */
  if (room.userCount > 100) return Promise.resolve();

  debug('Notifying room %s of new users having been added', room._id);

  return restSerializer
    .serialize(userIds, new restSerializer.UserIdStrategy())
    .then(function(serializedUsers) {
      var roomUrl = '/rooms/' + room.id + '/users';
      serializedUsers.forEach(function(serializedUser) {
        appEvents.dataChange2(roomUrl, 'create', serializedUser, 'user');
      });
    });
}

function notifyUsersOfAddedGroupRooms(room, userIds) {
  debug('Notifying %s of being added to %s', userIds, room._id);

  var singleUserId = userIds.length === 1 && userIds[0];

  // TODO: custom serializations per user
  return restSerializer
    .serializeObject(
      room,
      new restSerializer.TroupeStrategy({ isRoomMember: true, currentUserId: singleUserId })
    )
    .then(function(serializedRoom) {
      userIds.forEach(function(userId) {
        var userUrl = '/user/' + userId + '/rooms';
        appEvents.dataChange2(userUrl, 'create', serializedRoom, 'room');
      });
    });
}

function notifyUsersOfAddedOneToOneRooms(room, userIds) {
  return Promise.map(userIds, function(userId) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: userId, isRoomMember: true });

    return restSerializer.serializeObject(room, strategy).then(function(serializedRoom) {
      appEvents.dataChange2('/user/' + userId + '/rooms', 'create', serializedRoom, 'room');
    });
  });
}

module.exports = {
  added: function(troupeId, userIds) {
    debug('Room %s: %s members added', troupeId, userIds.length);
    return troupeService.findById(troupeId).then(function(room) {
      if (room.oneToOne) {
        return notifyUsersOfAddedOneToOneRooms(room, userIds);
      }

      return Promise.join(
        notifyGroupRoomOfAddedUsers(room, userIds),
        notifyUsersOfAddedGroupRooms(room, userIds),
        userTypeaheadElastic.addUsersToGroupRoom(userIds, troupeId),
        function() {}
      );
    });
  },

  removed: function(troupeId, userIds) {
    // FIXME: NOCOMMIT deal with one to ones
    userIds.forEach(function(userId) {
      /* Dont mark the user as having been removed from the room */
      appEvents.dataChange2('/rooms/' + troupeId + '/users', 'remove', { id: userId }, 'user');
      appEvents.dataChange2('/user/' + userId + '/rooms', 'remove', { id: troupeId }, 'room');

      appEvents.userRemovedFromTroupe({ troupeId: troupeId, userId: userId });
    });

    return userTypeaheadElastic.removeUsersFromRoom(userIds, troupeId);
  },

  lurkChange: function(troupeId, userIds, lurk) {
    userIds.forEach(function(userId) {
      appEvents.userTroupeLurkModeChange({ userId: userId, troupeId: troupeId, lurk: lurk });

      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2(
        '/user/' + userId + '/rooms',
        'patch',
        { id: troupeId, lurk: lurk },
        'room'
      );
    });

    return Promise.resolve();
  }
};
