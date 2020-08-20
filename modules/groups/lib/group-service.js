'use strict';

var assert = require('assert');
var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var Group = require('gitter-web-persistence').Group;
var Troupe = require('gitter-web-persistence').Troupe;
var liveCollections = require('gitter-web-live-collection-events');
var validateGroupName = require('gitter-web-validators/lib/validate-group-name');
var StatusError = require('statuserror');
var debug = require('debug')('gitter:app:groups:group-service');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');
var checkIfGroupUriExists = require('./group-uri-checker');
var groupRoomFinder = require('./group-room-finder');
var groupFavouritesCore = require('./group-favourites-core');

/**
 * Find a group given an id
 */
function findById(groupId, opts = {}) {
  return Group.findById(groupId, {}, { lean: opts.lean || false }).exec();
}

function findByIds(ids) {
  return mongooseUtils.findByIds(Group, ids);
}

/**
 * Find a group given a URI
 */
function findByUri(uri, opts = {}) {
  assert(uri, 'uri required');
  return Group.findOne({ lcUri: uri.toLowerCase() }, {}, { lean: opts.lean || false }).exec();
}

// Find all rooms in a given group
function findRoomsInGroup(groupId) {
  return Troupe.find({
    groupId: groupId
  }).exec();
}

/**
 *
 */
function upsertGroup(user, groupInfo, securityDescriptor) {
  var uri = groupInfo.uri;
  var name = groupInfo.name || uri;
  var homeUri;

  if (groupInfo.useHomeUriSuffix) {
    homeUri = uri + '/home';
  } else {
    homeUri = uri;
  }

  var lcUri = uri.toLowerCase();
  var lcHomeUri = homeUri.toLowerCase();

  return mongooseUtils
    .upsert(
      Group,
      { lcUri: lcUri },
      {
        $setOnInsert: {
          name: name,
          uri: uri,
          lcUri: lcUri,
          homeUri: homeUri,
          lcHomeUri: lcHomeUri,
          sd: securityDescriptor
        }
      }
    )
    .spread(function(group, updateExisting) {
      if (!updateExisting) {
        /* Send a stat for a new group */
        stats.event('new_group', {
          uri: uri,
          groupId: group._id,
          userId: user._id,
          type: securityDescriptor.type === null ? 'none' : securityDescriptor.type
        });
      }

      return group;
    });
}

async function checkGroupUri(user, uri, options) {
  assert(user, 'user required');
  assert(uri, 'uri required');

  // type can be null
  var type = options.type;

  // obtainAccessFromGitHubRepo can be undefined
  var obtainAccessFromGitHubRepo = options.obtainAccessFromGitHubRepo;

  // run the same validation that gets used by the group uri checker service
  const info = await checkIfGroupUriExists(user, uri, obtainAccessFromGitHubRepo);

  if (!info.allowCreate) {
    // the frontend code should have prevented you from getting here
    /*
        NOTE: 409 because an invalid group uri would already have raised 400,
        so the reason why you can't create the group is either because a group
        or user already took that uri or because another github org or user
        took that uri. This means it also mirrors the check-group-uri endpount.
        */
    throw new StatusError(409, 'User is not allowed to create a group for this URI.');
  }

  // TODO: Do we need to worry about GL_GROUP?
  // My guess is not since this is the URL reservtation type of stuff which
  // we probably need to get rid of
  // TODO: Remove after we split from GitHub URIs (#github-uri-split)
  if (info.type === 'GH_ORG') {
    if (type !== 'GH_ORG' && type !== 'GH_GUESS') {
      // the frontend code should have prevented you from getting here
      throw new StatusError(400, 'Group must be type GH_ORG: ' + type);
    }
  }
}

/**
 * @private
 */
async function ensureAccessAndFetchGroupInfo(user, options) {
  options = options || {};

  var name = options.name;
  assert(name, 'name required');
  if (!validateGroupName(name)) {
    throw new StatusError(400, 'Invalid group name');
  }

  // uri gets validated by checkGroupUri below
  var uri = options.uri;

  // we only support public groups for now
  var security = options.security || 'PUBLIC';
  if (security !== 'PUBLIC') {
    throw new StatusError(400, 'Invalid group security: ' + security);
  }

  // This will throw if there are any problems
  await checkGroupUri(user, uri, options);

  const securityDescriptor = await ensureAccessAndFetchDescriptor(user, options);

  return [
    {
      name: name,
      uri: uri,
      useHomeUriSuffix: options.useHomeUriSuffix
    },
    securityDescriptor
  ];
}

/**
 * Create a new group
 */
async function createGroup(user, options) {
  const [groupInfo, securityDescriptor] = await ensureAccessAndFetchGroupInfo(user, options);
  debug('Upserting %j with securityDescriptor=%j', groupInfo, securityDescriptor);
  return upsertGroup(user, groupInfo, securityDescriptor);
}

function findRoomsIdForGroup(groupId, userId) {
  assert(groupId, 'groupId is required');

  return groupRoomFinder.queryForAccessibleRooms(groupId, userId).then(function(query) {
    return Troupe.distinct('_id', query).exec();
  });
}

function setAvatarForGroup(groupId, url) {
  var query = { _id: groupId };

  var update = {
    $set: {
      avatarUrl: url
    },
    $inc: {
      avatarVersion: 1
    }
  };

  return Group.findOneAndUpdate(query, update).exec();
}

function updateFavourite(userId, groupId, favouritePosition) {
  return groupFavouritesCore
    .updateFavourite(userId, groupId, favouritePosition)
    .then(function(position) {
      liveCollections.userGroups.emit('patch', userId, groupId, { favourite: position });
    });
}

function deleteGroup(group) {
  assert(group, 'group is required');

  // Avoid the circular dependency with the rooms module using `gitter-web-groups`
  // This will cause an empty object import in the rooms module
  var roomService = require('gitter-web-rooms');

  return findRoomsInGroup(group.get('id'))
    .then(rooms => {
      return rooms.reduce((promiseChain, room) => {
        return promiseChain.then(() => {
          return roomService.deleteRoom(room);
        });
      }, Promise.resolve());
    })
    .then(() => {
      return group.remove();
    });
}

module.exports = {
  findByUri: Promise.method(findByUri),
  findById: Promise.method(findById),
  findByIds: findByIds,
  findRoomsInGroup: findRoomsInGroup,
  createGroup: Promise.method(createGroup),
  deleteGroup: deleteGroup,
  findRoomsIdForGroup: Promise.method(findRoomsIdForGroup),
  setAvatarForGroup: setAvatarForGroup,
  findFavouriteGroupsForUser: groupFavouritesCore.findFavouriteGroupsForUser,
  updateFavourite: updateFavourite
};
