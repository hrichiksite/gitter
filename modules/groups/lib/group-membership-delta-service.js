'use strict';

var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var persistence = require('gitter-web-persistence');
var TroupeUser = persistence.TroupeUser;
var _ = require('lodash');

function isUserInGroup(userId, groupId, excludeRoomId) {
  if (!groupId || !userId) return false;

  userId = mongoUtils.asObjectID(userId);
  groupId = mongoUtils.asObjectID(groupId);

  var match = {
    userId: userId
  };

  if (excludeRoomId) {
    match.troupeId = { $ne: mongoUtils.asObjectID(excludeRoomId) };
  }

  return TroupeUser.aggregate([
    { $match: match },
    { $project: { _id: 0, troupeId: 1 } },
    {
      $lookup: {
        from: 'troupes',
        localField: 'troupeId',
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
      $limit: 1
    },
    {
      $project: {
        _id: 0,
        exists: '$troupe.groupId'
      }
    }
  ])
    .exec()
    .then(function(results) {
      return results.length > 0;
    });
}

/**
 * Returns a hash of users who are in the group
 */
function checkUsersInGroup(groupId, userIds, excludeRoomId) {
  if (!groupId || !userIds || !userIds.length) return {};

  groupId = mongoUtils.asObjectID(groupId);

  var match = mongoUtils.fieldInPredicate('userId', userIds);

  if (excludeRoomId) {
    match.troupeId = { $ne: mongoUtils.asObjectID(excludeRoomId) };
  }

  return TroupeUser.aggregate([
    { $match: match },
    { $project: { _id: 0, troupeId: 1, userId: 1 } },
    {
      $lookup: {
        from: 'troupes',
        localField: 'troupeId',
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
      $group: {
        _id: '$userId'
      }
    }
  ])
    .exec()
    .then(function(results) {
      return _.reduce(
        results,
        function(memo, result) {
          memo[result._id] = true;
          return memo;
        },
        {}
      );
    });
}

module.exports = {
  isUserInGroup: Promise.method(isUserInGroup),
  checkUsersInGroup: Promise.method(checkUsersInGroup)
};
