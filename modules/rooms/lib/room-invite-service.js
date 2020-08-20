'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
const config = env.config;
const redisClient = env.redis.getClient();
var Promise = require('bluebird');
var isValidEmail = require('email-validator').validate;
var StatusError = require('statuserror');
const dolph = require('dolph');
var emailNotificationService = require('gitter-web-email-notifications');
var roomService = require('gitter-web-rooms');
var invitesService = require('gitter-web-invites/lib/invites-service');

/**
 * @private
 */
function addUserToRoomInsteadOfInvite(room, invitingUser, userToInvite) {
  return roomService.addUserToRoom(room, invitingUser, userToInvite);
}

/**
 * @private
 */
function createInviteForNewUser(room, invitingUser, type, externalId, emailAddress) {
  return Promise.try(function() {
    // If an email address is provided, assert that its valid
    // and use it
    if (emailAddress) {
      if (!isValidEmail(emailAddress)) {
        throw new StatusError(400);
      }
      return emailAddress;
    }

    // No email address was provided, attempt to
    // sniff out the email address given the external username and type
    return invitesService.resolveEmailAddress(invitingUser, type, externalId);
  })
    .bind({
      email: null
    })
    .then(function(resolvedEmailAddress) {
      // The client needs to submit the request with an email address
      if (!resolvedEmailAddress) throw new StatusError(428);

      return invitesService.createInvite(room._id, {
        type: type,
        externalId: externalId,
        emailAddress: resolvedEmailAddress,
        invitedByUserId: invitingUser._id
      });
    })
    .tap(function(invite) {
      stats.event('new_invite', {
        userId: invitingUser && (invitingUser.id || invitingUser._id),
        troupeId: room && (room.id || room._id),
        type: type,
        uri: room && room.uri
      });

      return emailNotificationService.sendInvitation(invitingUser, invite, room);
    })
    .then(function(invite) {
      return invite.emailAddress;
    });
}

const ROOM_INVITE_RATE_LIMIT_THRESHOLD = config.get('email:inviteEmailAbuseThresholdPerDay') || 10;
const ROOM_INVITE_RATE_LIMIT_EXPIRY = 24 * 60 * 60;
const roomInviteRateLimiter = Promise.promisify(
  dolph.rateLimiter({
    prefix: 'ris:',
    redisClient: redisClient
  })
);

/**
 * @return {
 *           status: 'added'/'invited'
 *           emailAddress: '...'        // When the user has been invited
 *           user: '...'                // When the user was added
 *         }
 * @throws HTTP 428 (email address required)
 */
async function createInvite(room, invitingUser, options) {
  const type = options.type;
  const externalId = options.externalId;
  const emailAddress = options.emailAddress;

  // Firstly, try figure out whether this user is already on gitter.
  const userToInvite = await invitesService.findExistingUser(type, externalId);

  if (userToInvite) {
    // The user already exists!
    // Rather than inviting them, we'll add them
    // immediately (for now)
    return addUserToRoomInsteadOfInvite(room, invitingUser, userToInvite).then(function() {
      return {
        status: 'added',
        user: userToInvite
      };
    });
  } else {
    // See https://gitlab.com/gitlab-org/gitter/webapp/issues/2153
    if (config.get('email:limitInviteEmails')) {
      const count = await roomInviteRateLimiter(invitingUser.id, ROOM_INVITE_RATE_LIMIT_EXPIRY);
      if (count > ROOM_INVITE_RATE_LIMIT_THRESHOLD) {
        throw new StatusError(
          501,
          `Inviting a user by email is limited to ${ROOM_INVITE_RATE_LIMIT_THRESHOLD} per day, see #2153`
        );
      }
    }

    // The user doesn't exist. We'll try invite them
    return createInviteForNewUser(room, invitingUser, type, externalId, emailAddress).then(function(
      resolvedEmailAddress
    ) {
      return {
        status: 'invited',
        emailAddress: resolvedEmailAddress
      };
    });
  }
}

module.exports = {
  createInvite: Promise.method(createInvite)
};
