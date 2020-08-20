'use strict';

var Promise = require('bluebird');
var TroupeInvite = require('gitter-web-persistence').TroupeInvite;
var uuid = require('uuid/v4');
var assert = require('assert');
var StatusError = require('statuserror');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var GitHubUserEmailAddressService = require('gitter-web-github').GitHubUserEmailAddressService;
var persistence = require('gitter-web-persistence');
var identityService = require('gitter-web-identity');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

var MS_PER_DAY = 24 * 60 * 60 * 1000;

var GITTER_IDENTITY_TYPE = 'gitter';
var GITHUB_IDENTITY_PROVIDER = identityService.GITHUB_IDENTITY_PROVIDER;

function findExistingGitterUser(username) {
  return persistence.User.findOne({ username: username }).exec();
}

function findExistingIdentityUsername(provider, username) {
  return identityService.findUserIdForProviderUsername(provider, username).then(function(userId) {
    if (!userId) return;
    return persistence.User.findById(userId).exec();
  });
}

function findExistingUser(type, externalId) {
  switch (type) {
    case GITTER_IDENTITY_TYPE:
      return findExistingGitterUser(externalId);

    case GITHUB_IDENTITY_PROVIDER:
      // TODO: Note that we will need to do a lookup once
      // splitville is complete and gitter usernames <> github usernames
      return findExistingGitterUser(externalId);

    // TODO: twitter?
    // TODO: gitlab?
  }

  return findExistingIdentityUsername(type, externalId);
}

function resolveGitHubUserEmail(invitingUser, githubUsername) {
  var githubUserEmailAddressService = new GitHubUserEmailAddressService(invitingUser);
  return githubUserEmailAddressService.findEmailAddressForGitHubUser(githubUsername);
}

function resolveEmailAddress(invitingUser, type, externalId) {
  // For now, we only try resolve email addresses for GitHub users
  if (type === GITHUB_IDENTITY_PROVIDER) {
    return resolveGitHubUserEmail(invitingUser, externalId);
  }

  return null;
}

/**
 *
 */
function createInvite(roomId, options) {
  var type = options.type;
  var externalId = options.externalId;
  var invitedByUserId = options.invitedByUserId;
  var emailAddress = options.emailAddress;

  if (type === 'email') {
    // Email address is mandatory
    if (!emailAddress) throw new StatusError(400);
    externalId = emailAddress;
  } else {
    if (!externalId) throw new StatusError(400);
    // Email address is optional
  }

  externalId = externalId.toLowerCase();
  var secret = uuid();
  return TroupeInvite.create({
    troupeId: roomId,
    type: type,
    externalId: externalId,
    emailAddress: emailAddress,
    userId: null,
    secret: secret,
    invitedByUserId: invitedByUserId,
    state: 'PENDING'
  }).catch(mongoUtils.mongoErrorWithCode(11000), function() {
    throw new StatusError(409); // Conflict
  });
}

/**
 *
 */
function accept(userId, secret) {
  assert(secret);
  return TroupeInvite.findOne({ secret: String(secret) })
    .lean()
    .exec()
    .then(function(invite) {
      if (!invite) throw new StatusError(404);
      if (invite.userId) {
        // Is this user re-using the invite?

        if (!mongoUtils.objectIDsEqual(invite.userId, userId)) {
          throw new StatusError(404);
        }
      }

      return invite;
    });
}

/**
 *
 */
function markInviteAccepted(inviteId, userId) {
  return TroupeInvite.update(
    {
      _id: inviteId,
      state: { $ne: 'ACCEPTED' }
    },
    {
      $set: {
        state: 'ACCEPTED',
        userId: userId
      }
    }
  ).exec();
}

/**
 *
 */
function markInviteRejected(inviteId, userId) {
  return TroupeInvite.update(
    {
      _id: inviteId,
      state: { $ne: 'REJECTED' }
    },
    {
      $set: {
        state: 'REJECTED',
        userId: userId
      }
    }
  ).exec();
}

/**
 *
 */
function markInviteReminded(inviteId) {
  return TroupeInvite.update(
    {
      _id: inviteId
    },
    {
      $set: {
        reminderSent: new Date()
      }
    }
  ).exec();
}

function findInvitesForReminder(timeHorizonDays) {
  var cutoffId = mongoUtils.createIdForTimestamp(Date.now() - timeHorizonDays * MS_PER_DAY);

  return TroupeInvite.aggregate([
    {
      $match: {
        state: 'PENDING',
        _id: { $lt: cutoffId },
        reminderSent: null
      }
    },
    {
      $project: {
        _id: 0,
        invite: '$$ROOT'
      }
    },
    {
      $lookup: {
        from: 'troupes',
        localField: 'invite.troupeId',
        foreignField: '_id',
        as: 'troupe'
      }
    },
    {
      $unwind: {
        path: '$troupe',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'invite.invitedByUserId',
        foreignField: '_id',
        as: 'invitedByUser'
      }
    },
    {
      $unwind: {
        path: '$invitedByUser',
        preserveNullAndEmptyArrays: true
      }
    }
  ]).exec();
}

/**
 * For exporting things
 */
function getInvitesCursorByUserId(userId) {
  const cursor = TroupeInvite.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

/**
 * For exporting things
 */
function getSentInvitesCursorByUserId(userId) {
  const cursor = TroupeInvite.find({
    invitedByUserId: userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

module.exports = {
  findExistingUser: findExistingUser,
  resolveEmailAddress: resolveEmailAddress,
  createInvite: Promise.method(createInvite),
  accept: Promise.method(accept),
  markInviteAccepted: Promise.method(markInviteAccepted),
  markInviteRejected: Promise.method(markInviteRejected),
  findInvitesForReminder: findInvitesForReminder,
  markInviteReminded: markInviteReminded,
  getInvitesCursorByUserId,
  getSentInvitesCursorByUserId
};
