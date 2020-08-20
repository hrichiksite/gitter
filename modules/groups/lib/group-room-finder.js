'use strict';

var Promise = require('bluebird');
var TroupeUser = require('gitter-web-persistence').TroupeUser;
var _ = require('lodash');

function findUserRoomIdsWithinGroup(groupId, userId) {
  return TroupeUser.aggregate([
    { $match: { userId: userId } },
    { $project: { _id: '$troupeId' } },
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
      $match: {
        'troupe.groupId': groupId
      }
    },
    {
      $project: {
        _id: 1
      }
    }
  ])
    .exec()
    .then(function(results) {
      return _.map(results, function(f) {
        return f._id;
      });
    });
}

function queryForPublicRooms(groupId) {
  return { groupId: groupId, 'sd.public': true };
}

function queryForPublicRoomsInGroupIds(groupIds) {
  return { groupId: { $in: groupIds }, 'sd.public': true };
}

function queryForAccessibleRooms(groupId, userId) {
  if (!userId) return queryForPublicRooms(groupId);

  return findUserRoomIdsWithinGroup(groupId, userId).then(function(memberTroupeIds) {
    return {
      groupId: groupId,
      $or: [
        { _id: { $in: memberTroupeIds } },
        { 'sd.public': true },
        { 'sd.extraAdmins': { $elemMatch: { $eq: userId } } },
        { 'sd.extraMembers': { $elemMatch: { $eq: userId } } }
      ]
    };
  });
}

module.exports = {
  queryForPublicRooms: queryForPublicRooms,
  queryForPublicRoomsInGroupIds: queryForPublicRoomsInGroupIds,
  queryForAccessibleRooms: Promise.method(queryForAccessibleRooms)
};
