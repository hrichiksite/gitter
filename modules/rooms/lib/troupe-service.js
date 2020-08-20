'use strict';

var persistence = require('gitter-web-persistence');
var assert = require('assert');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
const debug = require('debug')('gitter:app:troupe-service');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var roomMembershipService = require('./room-membership-service');

function findByUri(uri, callback) {
  var lcUri = uri.toLowerCase();

  return persistence.Troupe.findOne({ lcUri: lcUri })
    .exec()
    .nodeify(callback);
}

function findByUris(uris) {
  if (!uris.length) return [];
  var lcUris = uris.map(function(f) {
    return f.toLowerCase();
  });

  return persistence.Troupe.find({ lcUri: { $in: lcUris } })
    .lean()
    .exec();
}

function findByIds(ids) {
  return mongooseUtils.findByIds(persistence.Troupe, ids);
}

function findByIdsLean(ids, select) {
  return mongooseUtils.findByIdsLean(persistence.Troupe, ids, select);
}

function findById(id, callback) {
  assert(mongoUtils.isLikeObjectId(id));

  return persistence.Troupe.findById(id)
    .exec()
    .nodeify(callback);
}

function findByIdLean(id) {
  assert(mongoUtils.isLikeObjectId(id));

  return persistence.Troupe.findById(id)
    .lean()
    .exec();
}

function checkIdExists(id) {
  return persistence.Troupe.findById(id)
    .count()
    .exec()
    .then(function(count) {
      return count > 0;
    });
}

/**
 * [{troupe without users}, userIsInRoom:boolean]
 */
function findByIdLeanWithMembership(troupeId, userId) {
  troupeId = mongoUtils.asObjectID(troupeId);
  if (userId) {
    return Promise.join(
      persistence.Troupe.findOne({ _id: troupeId }, {}, { lean: true }).exec(),
      roomMembershipService.checkRoomMembership(troupeId, userId),
      function(leanTroupe, roomMember) {
        if (!leanTroupe) {
          debug(`findByIdLeanWithMembership found no troupe`);
          return [null, false];
        }
        leanTroupe.id = mongoUtils.serializeObjectId(leanTroupe._id);
        debug(
          `findByIdLeanWithMembership found ${JSON.stringify(leanTroupe)} roomMember=${roomMember}`
        );
        return [leanTroupe, roomMember];
      }
    );
  }

  // Query without userId
  return persistence.Troupe.findOne({ _id: troupeId }, {}, { lean: true })
    .exec()
    .then(function(result) {
      if (!result) return [null, false];
      result.id = mongoUtils.serializeObjectId(result._id);
      return [result, false];
    });
}

/**
 * Returns true if the GitHub type for the uri matches
 * the provided github type
 */
function checkGitHubTypeForUri(uri, githubType) {
  var lcUri = uri.toLowerCase();

  return persistence.Troupe.count({ lcUri: lcUri, githubType: githubType })
    .exec()
    .then(function(count) {
      return !!count;
    });
}

function findPublicRoomsByTypeAndLinkPaths(type, linkPaths) {
  var query = {
    'sd.type': type,
    'sd.linkPath': { $in: linkPaths },
    'sd.public': true
  };

  return persistence.Troupe.find(query)
    .lean()
    .exec();
}

module.exports = {
  findByUri: findByUri,
  findByUris: Promise.method(findByUris),
  findById: findById,
  findByIdLean: findByIdLean,
  checkIdExists: checkIdExists,
  findByIds: findByIds,
  findByIdsLean: findByIdsLean,
  findByIdLeanWithMembership: findByIdLeanWithMembership,
  checkGitHubTypeForUri: checkGitHubTypeForUri,
  findPublicRoomsByTypeAndLinkPaths: findPublicRoomsByTypeAndLinkPaths
};
