'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
const config = env.config;

var appEvents = require('gitter-web-appevents');
var assert = require('assert');
var Promise = require('bluebird');
var _ = require('lodash');
var persistence = require('gitter-web-persistence');
var uriLookupService = require('gitter-web-uri-resolver/lib/uri-lookup-service');
var addInvitePolicyFactory = require('gitter-web-permissions/lib/add-invite-policy-factory');
var userService = require('gitter-web-users');
var troupeService = require('./troupe-service');
var userDefaultFlagsService = require('./user-default-flags-service');
var collections = require('gitter-web-utils/lib/collections');
var StatusError = require('statuserror');
var emailNotificationService = require('gitter-web-email-notifications');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var roomSearch = require('gitter-web-elasticsearch/lib/room-search');
var assertJoinRoomChecks = require('./assert-join-room-checks');
var unreadItemService = require('gitter-web-unread-items');
var debug = require('debug')('gitter:app:room-service');
var roomMembershipService = require('./room-membership-service');
var recentRoomService = require('./recent-room-service');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var liveCollections = require('gitter-web-live-collection-events');
var roomRepoService = require('./room-repo-service');

/**
 * sendJoinStats() sends stats about a join_room event
 *
 * user       User
 * room       Troupe
 * tracking   Object - contains stats info
 */
function sendJoinStats(user, room, tracking) {
  stats.event('join_room', {
    userId: user.id,
    source: tracking && tracking.source,
    room_uri: room.uri,
    owner: getOrgNameFromTroupeName(room.uri),
    troupeId: room.id,
    groupId: room.groupId
  });
}

/**
 * Returns the list of rooms to be displayed for the user. This will
 * include all rooms in which the user is a member and additionally
 * the list of rooms where the user is not a member but has been mentioned.
 */
function findAllRoomsIdsForUserIncludingMentions(userId, callback) {
  return Promise.all([
    unreadItemService.getRoomIdsMentioningUser(userId),
    roomMembershipService.findRoomIdsForUser(userId)
  ])
    .spread(function(mentions, memberships) {
      var hash = collections.hashArray(memberships);
      var nonMemberRooms = [];
      _.each(mentions, function(mentionTroupeId) {
        if (!hash[mentionTroupeId]) {
          hash[mentionTroupeId] = true;
          nonMemberRooms.push(mentionTroupeId);
        }
      });

      return [Object.keys(hash), nonMemberRooms];
    })
    .asCallback(callback);
}

/**
 * notifyInvitedUser() informs existing user that they were invited to a room
 *
 * fromUser       User - the inviter
 * invitedUser    User - the invited user
 * room           Room - the room in context
 */
async function notifyInvitedUser(fromUser, invitedUser, room) {
  // get the email address
  if (invitedUser.state === 'REMOVED') {
    stats.event('user_added_removed_user');
    return;
  }

  // See https://gitlab.com/gitlab-org/gitter/webapp/issues/2153
  if (!config.get('email:limitInviteEmails')) {
    await emailNotificationService
      .addedToRoomNotification(fromUser, invitedUser, room)
      .catch(function(err) {
        logger.error('Unable to send added to room notification: ' + err, { exception: err });
      });
  }

  var metrics = {
    notification: 'email_notification_sent',
    troupeId: room.id,
    to: invitedUser.username,
    from: fromUser.username
  };

  stats.event('user_added_someone', _.extend(metrics, { userId: fromUser.id }));
}

function updateUserDateAdded(userId, roomId, date) {
  var setOp = {};
  setOp['added.' + roomId] = date || new Date();

  return persistence.UserTroupeLastAccess.update(
    { userId: userId },
    { $set: setOp },
    { upsert: true }
  ).exec();
}

/**
 * Adds a user to a room. Please note that the security checks should
 * have already occurred in the caller
 */
function joinRoom(room, user, options) {
  options = options || {};

  if (!room) throw new StatusError(400);

  return assertJoinRoomChecks(room, user)
    .then(function() {
      // We need to add the last access time before adding the member to the room
      // so that the serialized create that the user receives will contain
      // the last access time and not be hidden in the troupe list
      return recentRoomService.saveLastVisitedTroupeforUserId(user._id, room._id, {
        skipFayeUpdate: true
      });
    })
    .then(function() {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);

      return roomMembershipService.addRoomMember(room._id, user._id, flags, room.groupId);
    })
    .then(function(wasAdded) {
      if (wasAdded) {
        sendJoinStats(user, room, options.tracking);
      }
    });
}

/**
 * Somebody adds another user to a room.
 * Caller needs to ensure that the instigatingUser can add
 * the user to the room
 */
function addUserToRoom(room, instigatingUser, userToAdd) {
  assert(userToAdd && userToAdd.username, 'userToAdd required');
  var usernameToAdd = userToAdd.username;

  return addInvitePolicyFactory
    .createPolicyForRoomAdd(userToAdd, room)
    .then(function(policy) {
      return policy.canJoin();
    })
    .then(function(canJoin) {
      if (!canJoin)
        throw new StatusError(403, usernameToAdd + ' does not have permission to join this room.');
    })
    .then(function() {
      return assertJoinRoomChecks(room, userToAdd);
    })
    .then(function() {
      // We need to add the last access time before adding the member to the room
      // so that the serialized create that the user receives will contain
      // the last access time and not be hidden in the troupe list
      return recentRoomService.saveLastVisitedTroupeforUserId(userToAdd._id, room._id, {
        skipFayeUpdate: true
      });
    })
    .then(function() {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(userToAdd);
      return roomMembershipService.addRoomMember(room._id, userToAdd._id, flags, room.groupId);
    })
    .then(function(wasAdded) {
      if (!wasAdded) return userToAdd;

      return Promise.all([
        notifyInvitedUser(instigatingUser, userToAdd, room),
        updateUserDateAdded(userToAdd.id, room.id)
      ]);
    })
    .then(function() {
      return userToAdd;
    });
}

/**
 * Remove user from room
 * If the user to be removed is not the one requesting, check permissions
 */
function removeUserFromRoom(room, user) {
  if (!user) throw new StatusError(400, 'User required');

  // TODO: consider whether this check is still necessary?
  if (room.oneToOne) throw new StatusError(400, 'This room does not support removing.');

  return removeUserIdFromRoom(room, user._id);
}

/**
 */
function removeUserIdFromRoom(room, userId) {
  if (!room) throw new StatusError(400, 'Room required');
  if (!userId) throw new StatusError(400, 'userId required');

  return roomMembershipService.removeRoomMember(room._id, userId, room.groupId).then(function() {
    // Remove favorites, unread items and last access times
    return recentRoomService.removeRecentRoomForUser(userId, room._id);
  });
}

function removeRoomMemberById(roomId, userId) {
  return persistence.TroupeUser.findById(roomId, { _id: 0, groupId: 1 })
    .exec()
    .then(function(room) {
      var groupId = room && room.groupId;
      return roomMembershipService.removeRoomMember(roomId, userId, groupId);
    });
}
/**
 * Hides a room for a user.
 */
function hideRoomFromUser(room, userId) {
  assert(room && room.id, 'room parameter required');
  assert(userId, 'userId parameter required');
  var roomId = room.id;

  return recentRoomService
    .removeRecentRoomForUser(userId, roomId)
    .then(function() {
      return roomMembershipService.getMemberLurkStatus(roomId, userId);
    })
    .then(function(userLurkStatus) {
      if (userLurkStatus === null) {
        // User does not appear to be in the room...
        appEvents.dataChange2('/user/' + userId + '/rooms', 'remove', { id: roomId }, 'room');
        return;
      }

      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2(
        '/user/' + userId + '/rooms',
        'patch',
        {
          id: roomId,
          favourite: null,
          lastAccessTime: null,
          activity: 0,
          mentions: 0,
          unreadItems: 0
        },
        'room'
      );

      // If somebody is lurking in a room
      // and the room is not one-to-one
      // remove them from the room
      // See https://github.com/troupe/gitter-webapp/issues/1743

      if (userLurkStatus && !room.oneToOne) {
        return removeRoomMemberById(roomId, userId);
      }
    });
}

/**
 * If the ban is found, returns troupeBan else returns null
 */
function findBanByUsername(troupeId, bannedUsername) {
  return userService.findByUsername(bannedUsername).then(function(user) {
    if (!user) return;

    return persistence.Troupe.findOne(
      {
        _id: mongoUtils.asObjectID(troupeId),
        'bans.userId': user._id
      },
      { _id: 0, 'bans.$': 1 },
      { lean: true }
    )
      .exec()
      .then(function(troupe) {
        if (!troupe || !troupe.bans || !troupe.bans.length) return;

        return troupe.bans[0];
      });
  });
}

function searchRooms(userId, queryText, options) {
  return roomMembershipService
    .findPrivateRoomIdsForUser(userId)
    .then(function(privateRoomIds) {
      return roomSearch.searchRooms(queryText, userId, privateRoomIds, options);
    })
    .then(function(roomIds) {
      return troupeService.findByIds(roomIds).then(function(rooms) {
        return collections.maintainIdOrder(roomIds, rooms);
      });
    });
}

/**
 * Delete room
 */
function deleteRoom(troupe) {
  var userListPromise;
  if (troupe.oneToOne) {
    userListPromise = Promise.resolve(
      troupe.oneToOneUsers.map(function(t) {
        return t.userId;
      })
    );
  } else {
    userListPromise = roomMembershipService.findMembersForRoom(troupe._id);
  }

  return userListPromise
    .then(function(userIds) {
      return Promise.all(
        userIds.map(function(userId) {
          // Remove favorites, unread items and last access times
          return recentRoomService.removeRecentRoomForUser(userId, troupe._id);
        })
      ).then(function() {
        // Remove all the folk from the room
        return roomMembershipService.removeRoomMembers(troupe._id, userIds, troupe.groupId);
      });
    })
    .then(function() {
      return troupe.remove();
    })
    .then(function() {
      // TODO: NB: remove channel reference from parent room if this is a channel
      return Promise.all([
        persistence.ChatMessage.remove({ toTroupeId: troupe._id }).exec(),
        persistence.Event.remove({ toTroupeId: troupe._id }).exec()
        // TODO: webhooks
      ]);
    });
}

// This is the new way to add any type of room to a group and should replace
// all the types of room creation except one-to-ones
function createGroupRoom(user, group, roomInfo, securityDescriptor, options) {
  debug(
    'createGroupRoom: groupId=%s roomInfo=%j securityDescriptor=%j options=%j',
    group._id,
    roomInfo,
    securityDescriptor,
    options
  );

  options = options || {}; // options.tracking
  var uri = roomInfo.uri;
  var topic = roomInfo.topic;
  var lcUri = uri.toLowerCase();
  var providers = roomInfo.providers;
  var addBadge = options.addBadge;

  // convert back to the old github-tied vars here
  var type = securityDescriptor.type || null;

  var roomType;
  switch (type) {
    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
      roomType = 'github-room';
      break;

    case 'GL_GROUP':
    case 'GL_PROJECT':
      roomType = 'gitlab-room';
      break;

    case null:
    case 'GROUP':
      // TODO: this is not very descriptive
      roomType = 'group-room'; // or channel?
      break;

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }

  var insertData = {
    groupId: group._id,
    topic: topic || '',
    uri: uri,
    lcUri: lcUri,
    userCount: 0,
    sd: securityDescriptor,
    providers: providers || []
  };

  var room;

  return mongooseUtils
    .upsert(
      persistence.Troupe,
      { lcUri: lcUri },
      {
        $setOnInsert: insertData
      }
    )
    .spread(function(_room, updatedExisting) {
      // bind & tap both get too limiting, so just storing room here
      room = _room;
      if (updatedExisting) {
        throw new StatusError(409);
      }
    })
    .then(function() {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);
      return roomMembershipService.addRoomMember(room._id, user._id, flags, group._id);
    })
    .then(function() {
      // Send the created room notification
      emailNotificationService
        .createdRoomNotification(user, room) // send an email to the room's owner
        .catch(function(err) {
          logger.error('Unable to send create room notification: ' + err, { exception: err });
        });

      sendJoinStats(user, room, options.tracking);

      stats.event('create_room', {
        userId: user._id,
        roomType: roomType
      });

      return uriLookupService.reserveUriForTroupeId(room._id, uri);
    })
    .then(function() {
      if (!options.associateWithGitHubRepo) return;

      return roomRepoService.associateRoomToRepo(room, user, {
        repoUri: options.associateWithGitHubRepo,
        addBadge: addBadge
      });
    })
    .then(function(postCreationResults) {
      var hookCreationFailedDueToMissingScope =
        postCreationResults && postCreationResults.hookCreationFailedDueToMissingScope;
      return {
        troupe: room,
        didCreate: true, // would have 409'd otherwise
        hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope
      };
    });
}

function updateTopic(roomId, topic) {
  if (!topic) topic = '';
  if (topic.length > 4096) throw new StatusError(400);
  return persistence.Troupe.findOneAndUpdate({ _id: roomId }, { $set: { topic: topic } })
    .exec()
    .then(function() {
      liveCollections.rooms.emit('patch', roomId, { topic: topic });
      return null;
    });
}

module.exports = {
  findAllRoomsIdsForUserIncludingMentions: findAllRoomsIdsForUserIncludingMentions,
  joinRoom: Promise.method(joinRoom),
  addUserToRoom: addUserToRoom,
  removeUserFromRoom: Promise.method(removeUserFromRoom),
  removeUserIdFromRoom: Promise.method(removeUserIdFromRoom),
  removeRoomMemberById: removeRoomMemberById,
  hideRoomFromUser: hideRoomFromUser,
  findBanByUsername: findBanByUsername,
  searchRooms: searchRooms,
  deleteRoom: deleteRoom,
  createGroupRoom: createGroupRoom,
  updateTopic: updateTopic,
  testOnly: {
    updateUserDateAdded: updateUserDateAdded
  }
};
