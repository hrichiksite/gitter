'use strict';

var persistence = require('gitter-web-persistence');
var TroupeUser = persistence.TroupeUser;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var securityDescriptorAdminFilter = require('gitter-web-permissions/lib/security-descriptor-admin-filter');
var adminDiscovery = require('gitter-web-permissions/lib/admin-discovery');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
var groupMembershipEvents = new EventEmitter();

function findGroupsForUser(userId) {
  userId = mongoUtils.asObjectID(userId);
  return TroupeUser.aggregate([
    { $match: { userId: userId } },
    { $project: { troupeId: 1 } },
    {
      /* Join the troupes onto TroupeUser */
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
      /* Get the unique set of groups that the user is in */
      $group: { _id: '$troupe.groupId' }
    },
    {
      /* Join the group documents using the unique set of groupIds for the user */
      $lookup: {
        from: 'groups',
        localField: '_id',
        foreignField: '_id',
        as: 'group'
      }
    },
    {
      $unwind: '$group'
    },
    {
      $project: {
        _id: '$group._id',
        name: '$group.name',
        uri: '$group.uri',
        lcUri: '$group.lcUri',
        sd: '$group.sd',
        avatarVersion: '$group.avatarVersion',
        homeUri: '$group.homeUri',
        lcHomeUri: '$group.lcHomeUri'
      }
    }
  ])
    .read('primaryPreferred')
    .exec()
    .then(function(results) {
      return results;
    });
}

function findAdminGroupsForUser(user) {
  return Promise.join(
    adminDiscovery.discoverAdminGroups(user),
    findGroupsForUser(user._id),
    function(discoveredGroups, membershipGroups) {
      return mongoUtils.unionModelsById([discoveredGroups, membershipGroups]);
    }
  ).then(function(groups) {
    return securityDescriptorAdminFilter(user, groups);
  });
}

function findRoomIdsForUserInGroup(groupId, userId) {
  return TroupeUser.aggregate([
    { $match: { userId: userId } },
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
      $project: {
        _id: 0,
        troupeId: '$troupeId'
      }
    }
  ])
    .read(mongoReadPrefs.secondaryPreferred)
    .exec()
    .then(function(results) {
      if (!results || !results.length) {
        return [];
      }

      return _.map(results, function(result) {
        return result.troupeId;
      });
    });
}

function findRoomIdsForUserInGroups(userId, groupIds) {
  return TroupeUser.aggregate([
    { $match: { userId: userId } },
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
        'troupe.groupId': { $in: groupIds }
      }
    },
    {
      $project: {
        _id: 0,
        troupeId: '$troupeId'
      }
    }
  ])
    .read(mongoReadPrefs.secondaryPreferred)
    .exec()
    .then(function(results) {
      if (!results || !results.length) {
        return [];
      }

      return _.map(results, function(result) {
        return result.troupeId;
      });
    });
}

/* Exports */
module.exports = {
  findGroupsForUser: Promise.method(findGroupsForUser),
  findAdminGroupsForUser: Promise.method(findAdminGroupsForUser),
  findRoomIdsForUserInGroup: findRoomIdsForUserInGroup,
  findRoomIdsForUserInGroups: findRoomIdsForUserInGroups,
  events: groupMembershipEvents
};
