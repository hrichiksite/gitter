'use strict';

var Promise = require('bluebird');
var Troupe = require('gitter-web-persistence').Troupe;
var TroupeUser = require('gitter-web-persistence').TroupeUser;
var fixtureUtils = require('./fixture-utils');
const recentRoomCore = require('gitter-web-rooms/lib/recent-room-core');
var debug = require('debug')('gitter:tests:test-fixtures');

// This corresponds with require("giter-web-rooms/lib/room-membership-flags").MODES.all
var DEFAULT_ROOM_MEMBERSHIP_FLAGS = 109;

function generateSecurityDescriptorForTroupeFixture(f, fixture) {
  var securityDescriptor = f.securityDescriptor || {};

  var securityDescriptorType;
  if (securityDescriptor.type) {
    securityDescriptorType = securityDescriptor.type;
  } else {
    securityDescriptorType = f.oneToOne ? 'ONE_TO_ONE' : null;
  }

  var isPublic;
  var members;
  var admins;
  var internalId;

  if ('public' in securityDescriptor) {
    isPublic = securityDescriptor.public;
  } else {
    if (f.oneToOne) {
      isPublic = false;
    } else {
      if (f.security === 'PRIVATE') {
        isPublic = false;
      } else {
        isPublic = true;
      }
    }
  }

  if ('members' in securityDescriptor) {
    members = securityDescriptor.members;
  } else {
    if (f.oneToOne) {
      members = null;
    } else {
      if (f.security === 'PRIVATE') {
        members = 'INVITE';
      } else {
        members = 'PUBLIC';
      }
    }
  }

  if ('admins' in securityDescriptor) {
    admins = securityDescriptor.admins;
  } else {
    admins = 'MANUAL';
  }

  if (securityDescriptor.internalId) {
    internalId = fixture[securityDescriptor.internalId]._id;
  }

  return {
    // Permissions stuff
    type: securityDescriptorType,
    members: members,
    admins: admins,
    public: isPublic,
    linkPath: securityDescriptor.linkPath,
    externalId: securityDescriptor.externalId,
    internalId: internalId,
    extraMembers: securityDescriptor.extraMembers,
    extraAdmins: securityDescriptor.extraAdmins
  };
}

function bulkInsertTroupeUsers(troupeId, userIds, membershipStrategy) {
  var bulk = TroupeUser.collection.initializeUnorderedBulkOp();

  userIds.forEach(function(userId, index) {
    var membership = membershipStrategy && membershipStrategy(userId, index);
    var flags, lurk;

    if (membership) {
      flags = membership.flags;
      lurk = membership.lurk;
    } else {
      flags = DEFAULT_ROOM_MEMBERSHIP_FLAGS;
      lurk = false;
    }

    bulk
      .find({ troupeId: troupeId, userId: userId })
      .upsert()
      .updateOne({
        $set: { flags: flags, lurk: lurk },
        $setOnInsert: { troupeId: troupeId, userId: userId }
      });
  });

  return Promise.fromCallback(function(callback) {
    bulk.execute(callback);
  });
}

// eslint-disable-next-line complexity
function createTroupe(fixtureName, f, fixture) {
  var oneToOneUsers;

  if (f.oneToOne && f.userIds) {
    oneToOneUsers = f.userIds.map(function(userId) {
      return { userId: userId };
    });
  } else {
    oneToOneUsers = [];
  }

  var security = f.security || undefined;

  var uri, lcUri, githubType;
  if (f.oneToOne) {
    githubType = 'ONETOONE';
  } else {
    githubType = f.githubType || 'ORG';
    uri = f.uri || fixtureUtils.generateUri(githubType);

    lcUri = uri.toLowerCase();
  }

  var groupId = f.group && f.group._id;

  var doc = {
    uri: uri,
    lcUri: lcUri,
    githubId: f.githubId === true ? fixtureUtils.generateGithubId() : f.githubId || null,
    groupId: groupId,
    status: f.status || 'ACTIVE',
    oneToOne: f.oneToOne,
    security: security,
    oneToOneUsers: oneToOneUsers,
    githubType: githubType,
    dateDeleted: f.dateDeleted,
    userCount: (f.users && f.users.length) || f.userCount,
    tags: f.tags,
    providers: f.providers
  };

  doc.sd = generateSecurityDescriptorForTroupeFixture(f, fixture);

  debug('Creating troupe %s with %j', fixtureName, doc);
  return Troupe.create(doc).tap(async function(troupe) {
    if (!f.userIds || !f.userIds.length) return;

    await bulkInsertTroupeUsers(troupe._id, f.userIds, f.membershipStrategy);

    // By default we will add lastAccessTime unless you specify otherwise
    if (f.lastAccessTime !== false) {
      await Promise.all(
        f.userIds.map(function(userId) {
          return recentRoomCore.saveUserTroupeLastAccess(
            userId,
            troupe._id,
            f.lastAccessTime || new Date()
          );
        })
      );
    }
  });
}

function createTroupes(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^troupe(?!Meta)/)) {
      var expectedTroupe = expected[key];

      expectedTroupe.userIds =
        expectedTroupe.users &&
        expectedTroupe.users.map(function(user) {
          return fixture[user]._id;
        });

      var expectedSecurityDescriptor = expectedTroupe && expectedTroupe.securityDescriptor;
      if (expectedSecurityDescriptor) {
        expectedSecurityDescriptor.extraMembers =
          expectedSecurityDescriptor.extraMembers &&
          expectedSecurityDescriptor.extraMembers.map(function(user) {
            return fixture[user]._id;
          });

        expectedSecurityDescriptor.extraAdmins =
          expectedSecurityDescriptor.extraAdmins &&
          expectedSecurityDescriptor.extraAdmins.map(function(user) {
            return fixture[user]._id;
          });
      }

      return createTroupe(key, expectedTroupe, fixture).then(function(troupe) {
        fixture[key] = troupe;
      });
    }

    return null;
  });
}

module.exports = createTroupes;
