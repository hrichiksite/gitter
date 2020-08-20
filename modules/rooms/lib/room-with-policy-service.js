'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var _ = require('lodash');
var persistence = require('gitter-web-persistence');
var getMaxTagLength = require('gitter-web-shared/validation/validate-tag').getMaxTagLength;
var secureMethod = require('gitter-web-utils/lib/secure-method');
var StatusError = require('statuserror');
var Promise = require('bluebird');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var userService = require('gitter-web-users');
var eventService = require('gitter-web-events');
var chatService = require('gitter-web-chats');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var roomMembershipService = require('./room-membership-service');
var roomService = require('./room-service');
var roomRepoService = require('./room-repo-service');
var assert = require('assert');
var roomMetaService = require('./room-meta-service');
var processText = require('gitter-web-text-processor');

var roomInviteService = require('./room-invite-service');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
var validateProviders = require('gitter-web-validators/lib/validate-providers');

var MAX_RAW_TAGS_LENGTH = 200;

/**
 * This could do with a better name
 */
function RoomWithPolicyService(room, user, policy) {
  assert(room, 'Room required');
  assert(policy, 'Policy required');
  this.room = room;
  this.user = user;
  this.policy = policy;
}

function allowStaff() {
  return this.user && this.user.staff;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

function allowJoin() {
  return this.policy.canJoin();
}

function allowAddUser() {
  return this.policy.canAddUser();
}

/**
 * Allow staff or admins to update the tags for a room
 * @return {Promise} Promise of room
 */
RoomWithPolicyService.prototype.updateTags = secureMethod([allowStaff, allowAdmin], function(tags) {
  // null will ruin your day.
  tags = tags || '';

  var reservedTagTestRegex = /:/;
  var isStaff = this.user.staff;
  var room = this.room;

  var cleanTags = tags
    .trim()
    .slice(0, MAX_RAW_TAGS_LENGTH)
    .split(',')
    .filter(function(tag) {
      return !!tag; //
    })
    .map(function(tag) {
      return tag.trim().slice(0, getMaxTagLength(isStaff));
    })
    .filter(function(tag) {
      // staff can do anything
      if (isStaff) {
        return true;
      }
      // Users can only save, non-reserved tags
      if (!reservedTagTestRegex.test(tag)) {
        return true;
      }

      return false;
    });

  // Make sure a normal user doesn't clear out our already existing reserved-word(with colons) tags
  var reservedTags = [];
  if (!isStaff) {
    reservedTags = room.tags.filter(function(tag) {
      return reservedTagTestRegex.test(tag);
    });
  }

  room.tags = [].concat(cleanTags, reservedTags);

  return room.save();
});

/**
 * Allow admins to change the topic of a room
 */
RoomWithPolicyService.prototype.updateTopic = secureMethod(allowAdmin, function(topic) {
  var room = this.room;
  return roomService.updateTopic(room._id, topic);
});

/**
 * Allow admins and staff to change the providers for a room
 */
RoomWithPolicyService.prototype.updateProviders = secureMethod([allowStaff, allowAdmin], function(
  providers
) {
  var room = this.room;

  providers = providers || [];

  if (!validateProviders(providers)) {
    throw new StatusError(400, 'Invalid providers ' + providers.toString());
  }

  room.providers = providers;

  return room.save();
});

/**
 * Allow admins to toggle search indexing on a room
 */
RoomWithPolicyService.prototype.toggleSearchIndexing = secureMethod(allowAdmin, function(bool) {
  var room = this.room;
  room.noindex = bool;

  return room.save();
});

/**
 * Ban a user from the room. Caller should ensure admin permissions
 */
RoomWithPolicyService.prototype.banUserFromRoom = secureMethod([allowStaff, allowAdmin], function(
  username,
  options
) {
  var currentUser = this.user;
  var room = this.room;

  if (!username) throw new StatusError(400, 'Username required');
  if (currentUser.username === username) throw new StatusError(400, 'You cannot ban yourself');

  if (room.oneToOne) {
    throw new StatusError(400, 'Cannot ban in a oneToOne room');
  }

  return userService
    .findByUsername(username)
    .bind(this)
    .then(function(bannedUser) {
      if (!bannedUser) throw new StatusError(404, 'User ' + username + ' not found.');

      var existingBan = _.find(room.bans, function(ban) {
        return mongoUtils.objectIDsEqual(ban.userId, bannedUser._id);
      });

      // If there is already a ban or the room
      // type doesn't make sense for a ban, just remove the user
      // TODO: re-address this in https://github.com/troupe/gitter-webapp/pull/1679
      // Just ensure that the user is removed from the room
      if (existingBan) {
        return this.removeUserFromRoom(bannedUser).return(existingBan);
      }

      // Can only ban people from public rooms
      if (!securityDescriptorUtils.isPublic(room)) {
        return this.removeUserFromRoom(bannedUser).return(null); // Signals that the user was removed from room, but not banned
      }

      // Don't allow admins to be banned!
      return policyFactory
        .createPolicyForRoom(bannedUser, room)
        .then(function(bannedUserPolicy) {
          return bannedUserPolicy.canAdmin();
        })
        .then(function(bannedUserIsAdmin) {
          if (bannedUserIsAdmin) throw new StatusError(403, 'Cannot ban an administrator');
          var ban = room.addUserBan({
            userId: bannedUser._id,
            bannedBy: currentUser._id
          });

          return Promise.all([
            room.save(),
            roomMembershipService.removeRoomMember(room._id, bannedUser._id, room.groupId)
          ]).return(ban);
        })
        .tap(function() {
          if (options && options.removeMessages) {
            return chatService.removeAllMessagesForUserIdInRoomId(bannedUser._id, room._id);
          }
        })
        .tap(function() {
          return eventService
            .newEventToTroupe(
              room,
              currentUser,
              '@' + currentUser.username + ' banned @' + bannedUser.username,
              {
                service: 'bans',
                event: 'banned',
                bannedUser: bannedUser.username,
                prerendered: true,
                performingUser: currentUser.username
              },
              {}
            )
            .catch(function(err) {
              logger.error('Unable to create an event in troupe: ' + err, { exception: err });
            });
        });
    });
});

RoomWithPolicyService.prototype.unbanUserFromRoom = secureMethod([allowStaff, allowAdmin], function(
  bannedUserId
) {
  var currentUser = this.user;
  var room = this.room;

  if (!bannedUserId) throw new StatusError(400, 'bannedUserId required');

  return userService.findById(bannedUserId).then(function(bannedUser) {
    if (!bannedUser) throw new StatusError(404);

    /* Does the requesting user have admin rights to this room? */
    return persistence.Troupe.update(
      {
        _id: mongoUtils.asObjectID(room._id)
      },
      {
        $pull: {
          bans: {
            userId: bannedUserId
          }
        }
      }
    )
      .exec()
      .tap(function() {
        return eventService
          .newEventToTroupe(
            room,
            currentUser,
            'User @' + currentUser.username + ' unbanned @' + bannedUser.username,
            {
              service: 'bans',
              event: 'unbanned',
              bannedUser: bannedUser.username,
              prerendered: true,
              performingUser: currentUser.username
            },
            {}
          )
          .catch(function(err) {
            logger.error('Unable to create an event in troupe: ' + err, { exception: err });
          });
      });
  });
});

/**
 * User join room
 */
RoomWithPolicyService.prototype.joinRoom = secureMethod([allowJoin], function(options) {
  return roomService.joinRoom(this.room, this.user, options);
});

/**
 *  GET room meta/welcome-message
 */
RoomWithPolicyService.prototype.getMeta = secureMethod([allowJoin], async function() {
  const { welcomeMessage } = await roomMetaService.findMetaByTroupeId(this.room.id, [
    'welcomeMessage'
  ]);

  return {
    welcomeMessage: welcomeMessage || { text: '', html: '' }
  };
});

/**
 * Update the welcome message for a room
 */
RoomWithPolicyService.prototype.updateRoomMeta = secureMethod([allowAdmin], async function({
  welcomeMessage
} = {}) {
  const result = {};

  if (welcomeMessage) {
    const resultantWelcomeMessage = await processText('' + welcomeMessage);

    await roomMetaService.upsertMetaKey(this.room.id, 'welcomeMessage', resultantWelcomeMessage);

    result.welcomeMessage = resultantWelcomeMessage;
  }

  return result;
});

/**
 * Delete a room
 */
RoomWithPolicyService.prototype.deleteRoom = secureMethod([allowAdmin], function() {
  if (this.room.oneToOne) throw new StatusError(400, 'cannot delete one to one rooms');

  logger.warn('User deleting room ', {
    roomId: this.room._id,
    roomLcUri: this.room.lcUri,
    username: this.user.username,
    userId: this.user._id
  });
  return roomService.deleteRoom(this.room);
});

/**
 * Invite a non-gitter user to a room
 */
RoomWithPolicyService.prototype.createRoomInvitation = secureMethod([allowAddUser], function(
  type,
  externalId,
  emailAddress
) {
  return roomInviteService.createInvite(this.room, this.user, {
    type: type,
    externalId: externalId,
    emailAddress: emailAddress
  });
});

RoomWithPolicyService.prototype.createRoomInvitations = secureMethod([allowAddUser], function(
  invites
) {
  var room = this.room;
  var user = this.user;

  return Promise.map(invites, function(invite) {
    var type = invite.type;
    var externalId = invite.externalId;
    var emailAddress = invite.emailAddress;

    var inviteInfo = {
      type: type,
      externalId: externalId,
      emailAddress: emailAddress
    };

    return roomInviteService.createInvite(room, user, inviteInfo).catch(StatusError, function(err) {
      /*
        NOTE: We intercept some errors so that one failed invite doesn't fail
        everything and then pass information on about that error so it can
        ultimately  be returned to the client. Are there are kinds of errors we
        should be intercepting? Probably not safe to intercept ALL errors.

        Many (most?) of these would have been caught if the frontend used the
        check avatar API like it should, so it shouldn't be too likely anyway.
        */
      logger.error('Unable to create an invite: ' + err, {
        exception: err,
        invitingUserId: user._id.toString(),
        roomId: room._id.toString(),
        inviteInfo: inviteInfo
      });

      return {
        status: 'error', // as opposed to 'invited' or 'added'
        statusCode: err.status,
        inviteInfo: inviteInfo
      };
    });
  });
});

/**
 * Add an existing Gitter user to a room
 */
RoomWithPolicyService.prototype.addUserToRoom = secureMethod([allowAddUser], function(userToAdd) {
  return roomService.addUserToRoom(this.room, this.user, userToAdd);
});

/**
 * Always allows a user to remove themselves from a room
 */
function removeUserFromRoomAllowCurrentUser(userForRemove) {
  if (!this.user || !userForRemove) return false;
  return mongoUtils.objectIDsEqual(userForRemove._id, this.user._id);
}

/**
 * Remove a user from a room
 */
RoomWithPolicyService.prototype.removeUserFromRoom = secureMethod(
  [removeUserFromRoomAllowCurrentUser, allowAdmin],
  function(userForRemove) {
    return roomService.removeUserFromRoom(this.room, userForRemove);
  }
);

/**
 * Send a pull request badger post room creation
 */
RoomWithPolicyService.prototype.sendBadgePullRequest = secureMethod([allowAdmin], function(
  repoUri
) {
  return (repoUri
    ? Promise.resolve(repoUri)
    : roomRepoService.findAssociatedGithubRepoForRoom(this.room)
  )
    .bind(this)
    .then(function(repoUri) {
      if (!repoUri) throw new StatusError(400, 'Room not associated with repo');

      return roomRepoService.sendBadgePullRequestForRepo(this.room, this.user, repoUri);
    });
});

/**
 * configure room/repo hooks post room creation
 */
RoomWithPolicyService.prototype.autoConfigureHooks = secureMethod([allowAdmin], function() {
  return roomRepoService
    .findAssociatedGithubRepoForRoom(this.room)
    .bind(this)
    .then(function(repoUri) {
      if (!repoUri) throw new StatusError(400, 'Room not associated with repo');

      return roomRepoService.autoConfigureHooksForRoom(this.user, this.room, repoUri);
    });
});

function deleteMessageFromRoomEnsureRoomMatch(chatMessage) {
  if (!chatMessage || !mongoUtils.objectIDsEqual(chatMessage.toTroupeId, this.room._id)) {
    throw new StatusError(404);
  }
}

function deleteMessageFromRoomAllowSender(chatMessage) {
  if (!this.user || !chatMessage) return false;
  return mongoUtils.objectIDsEqual(chatMessage.fromUserId, this.user._id);
}

/**
 * Delete a message, if it's your own or you're a room admin
 */
RoomWithPolicyService.prototype.deleteMessageFromRoom = secureMethod(
  [deleteMessageFromRoomEnsureRoomMatch, allowAdmin, deleteMessageFromRoomAllowSender],
  function(chatMessage) {
    return chatService.deleteMessageFromRoom(this.room, chatMessage);
  }
);

module.exports = RoomWithPolicyService;
