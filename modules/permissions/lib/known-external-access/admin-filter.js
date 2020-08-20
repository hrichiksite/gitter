'use strict';

var Promise = require('bluebird');
var lazy = require('lazy.js');
var Group = require('gitter-web-persistence').Group;
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var _ = require('lodash');
var assert = require('assert');
var debug = require('debug')('gitter:app:permissions:admin-filter');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

function createHashFor(userIds) {
  return _.reduce(
    userIds,
    function(memo, userId) {
      memo[userId] = true;
      return memo;
    },
    {}
  );
}

function validateAdminsForSecurityDescriptor(securityDescriptor) {
  const validAdminMap = {
    GH_USER: 'GH_USER_SAME',
    GH_REPO: 'GH_REPO_PUSH',
    GH_ORG: 'GH_ORG_MEMBER',
    GL_USER: 'GL_USER_SAME',
    GL_GROUP: 'GL_GROUP_MAINTAINER',
    GL_PROJECT: 'GL_PROJECT_MAINTAINER'
  };
  return validAdminMap[securityDescriptor.type] === securityDescriptor.admins;
}

/**
 * Build a query for KnownExternalAccess given a security descriptor
 */
function getQueryForDescriptor(securityDescriptor) {
  if (!validateAdminsForSecurityDescriptor(securityDescriptor)) {
    return null;
  }

  return {
    type: securityDescriptor.type,
    policyName: securityDescriptor.admins,
    linkPath: securityDescriptor.linkPath,
    externalId: securityDescriptor.externalId
  };
}

/**
 * Given a query and an array of users,
 * find out which ones are known to have possibly been administrators by
 * querying KnownExternalAccess.
 *
 * @return [userIds] userIds of known admins
 */
function findUsersForQuery(sdQuery, userIds) {
  var disjunction = [];

  var query = {
    type: sdQuery.type,
    policyName: sdQuery.policyName,
    $or: disjunction,
    userId: { $in: userIds }
  };

  if (sdQuery.externalId) {
    disjunction.push({
      externalId: sdQuery.externalId
    });
  }

  if (sdQuery.linkPath) {
    disjunction.push({
      linkPath: sdQuery.linkPath
    });
  }

  // Without this, a user could be an administrator of everything...
  assert(disjunction.length > 0);

  return KnownExternalAccess.distinct('userId', query)
    .read(mongoReadPrefs.secondaryPreferred)
    .exec();
}

/**
 * Given a security descriptor, a list of userIds returns which of those
 * users are admins. Will recurse exactly one, if required to query the group
 * given a group backed room
 */
var adminFilterInternal = Promise.method(function(securityDescriptor, userIds, nested) {
  // First step: check extraAdmins
  var usersInExtraAdmins, usersNotInExtraAdmins;

  if (securityDescriptor.extraAdmins && securityDescriptor.extraAdmins.length) {
    var extraAdminsHash = createHashFor(securityDescriptor.extraAdmins);

    usersInExtraAdmins = userIds.filter(function(userId) {
      return extraAdminsHash[userId];
    });

    usersNotInExtraAdmins = userIds.filter(function(userId) {
      return !extraAdminsHash[userId];
    });
  } else {
    usersInExtraAdmins = lazy([]);
    usersNotInExtraAdmins = userIds;
  }

  if (usersNotInExtraAdmins.isEmpty()) {
    debug('All users matched in extraAdmins');
    return usersInExtraAdmins;
  }

  if (securityDescriptor.type === 'GROUP') {
    // Deal with GROUP permissions by fetching the group securityDescriptor and
    // recursively calling this method on that group
    if (nested || !securityDescriptor.internalId) {
      // nested == true would imply that a group references another group
      // which would be a bad situation, so we don't recurse further
      return usersInExtraAdmins;
    } else {
      // Fetch the group and recursively apply the filter to the group...
      return Group.findById(securityDescriptor.internalId, { sd: 1 })
        .read(mongoReadPrefs.secondaryPreferred)
        .lean()
        .exec()
        .then(function(group) {
          if (!group || !group.sd) {
            return usersNotInExtraAdmins;
          }

          var securityDescriptor = group.sd;
          return adminFilterInternal(securityDescriptor, usersNotInExtraAdmins, true);
        })
        .then(function(userIds) {
          return usersInExtraAdmins.concat(userIds);
        });
    }
  } else {
    // Not a group, deal with GL_USER, GL_GROUP, GL_PROJECT, GH_USER, GH_ORG, GH_REPO and null here
    var query = getQueryForDescriptor(securityDescriptor);

    if (query) {
      debug('Searching for users matching %j', query);

      return findUsersForQuery(query, usersNotInExtraAdmins.toArray()).then(function(adminUserIds) {
        if (!adminUserIds || !adminUserIds.length) {
          return usersInExtraAdmins;
        }

        debug(`Found admin users matching`, query, '->', adminUserIds);
        return usersInExtraAdmins.concat(lazy(adminUserIds));
      });
    } else {
      return usersInExtraAdmins;
    }
  }
});

/**
 * Given a group or room, which of the users are
 * probably admins.
 *
 * Shouty McShoutFace says:
 * THIS METHOD IS BEST GUESS ONLY AND SHOULD ONLY EVER BE USED FOR DISPLAY
 * PURPOSES, NOT REAL SECURITY. USE POLICY FACTORY FOR SECURITY.
 *
 * HKAY?
 */
function adminFilter(objectWithSd, userIds) {
  if (!userIds.length) return [];
  if (!objectWithSd.sd) return [];
  if (objectWithSd.sd.type === 'ONE_TO_ONE') return []; // No admins in one-to-one rooms

  return adminFilterInternal(objectWithSd.sd, lazy(userIds), false).then(function(userIds) {
    return userIds.toArray();
  });
}

module.exports = Promise.method(adminFilter);
