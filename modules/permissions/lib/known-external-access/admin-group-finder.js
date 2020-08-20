'use strict';

var Promise = require('bluebird');
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var Group = require('gitter-web-persistence').Group;
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

// Only search in last 100 used items
var MAX_ITEMS = 100;

function findKnownAccessOfTypeForUser(type, userId) {
  var query = {
    userId: userId,
    type: type
  };

  return KnownExternalAccess.find(query, {
    _id: 0,
    type: 1,
    policyName: 1,
    linkPath: 1,
    externalId: 1
  })
    .lean()
    .sort({ accessTime: -1 })
    .limit(MAX_ITEMS)
    .read(mongoReadPrefs.secondaryPreferred)
    .exec();
}

function createQueryFromKnownAccess(type, knownAccesses) {
  var disjunction = knownAccesses.reduce(function(memo, knownAccess) {
    var linkPath = knownAccess.linkPath;
    var externalId = knownAccess.externalId;
    var policyName = knownAccess.policyName;

    if (linkPath) {
      memo.push({
        'sd.type': type,
        'sd.admins': policyName,
        'sd.linkPath': linkPath
      });
    }

    if (externalId) {
      memo.push({
        'sd.type': type,
        'sd.admins': policyName,
        'sd.externalId': externalId
      });
    }

    return memo;
  }, []);

  // No good matches, return null
  if (!disjunction.length) return null;

  var query = {
    $or: disjunction
  };

  return query;
}

function findAdminGroupsOfTypeForUserId(type, userId) {
  if (!userId) return [];

  return findKnownAccessOfTypeForUser(type, userId).then(function(knownAccesses) {
    if (!knownAccesses.length) return [];

    var query = createQueryFromKnownAccess(type, knownAccesses);
    if (!query) return [];

    return Group.find(query)
      .lean()
      .read(mongoReadPrefs.secondaryPreferred)
      .exec();
  });
}

module.exports = {
  findAdminGroupsOfTypeForUserId: Promise.method(findAdminGroupsOfTypeForUserId)
};
