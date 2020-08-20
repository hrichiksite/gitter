'use strict';

var groupMembershipService = require('./group-membership-service');
var groupRoomFinder = require('./group-room-finder');
var persistence = require('gitter-web-persistence');
var Troupe = persistence.Troupe;

function findUnjoinedRoomsInGroup(groupId, userId) {
  return groupMembershipService
    .findRoomIdsForUserInGroup(groupId, userId)
    .then(function(joinedRoomIds) {
      var query = groupRoomFinder.queryForPublicRooms(groupId);
      query.troupeId = { $nin: joinedRoomIds };

      return Troupe.find(query)
        .sort({ userCount: -1 })
        .limit(10)
        .lean()
        .exec();
    });
}

function findUnjoinedRoomsInGroups(userId, groupIds) {
  return groupMembershipService
    .findRoomIdsForUserInGroups(userId, groupIds)
    .then(function(joinedRoomIds) {
      var query = groupRoomFinder.queryForPublicRoomsInGroupIds(groupIds);
      query.troupeId = { $nin: joinedRoomIds };

      return Troupe.find(query)
        .sort({ userCount: -1 })
        .limit(10)
        .lean()
        .exec();
    });
}

module.exports = {
  findUnjoinedRoomsInGroup: findUnjoinedRoomsInGroup,
  findUnjoinedRoomsInGroups: findUnjoinedRoomsInGroups
};
