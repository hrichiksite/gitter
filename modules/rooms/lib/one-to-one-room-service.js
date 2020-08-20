'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var userService = require('gitter-web-users');
var persistence = require('gitter-web-persistence');
var userDefaultFlagsService = require('./user-default-flags-service');
var Troupe = persistence.Troupe;
var assert = require('assert');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var ObjectID = require('mongodb').ObjectID;
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var StatusError = require('statuserror');
var roomMembershipService = require('./room-membership-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var debug = require('debug')('gitter:app:one-to-one-room-service');

function getOneToOneRoomQuery(userId1, userId2) {
  // Need to use $elemMatch due to a regression in Mongo 2.6, see https://jira.mongodb.org/browse/SERVER-13843
  return {
    $and: [
      { oneToOne: true },
      { oneToOneUsers: { $elemMatch: { userId: userId1 } } },
      { oneToOneUsers: { $elemMatch: { userId: userId2 } } }
    ]
  };
}

function findOneToOneRoom(fromUserId, toUserId) {
  assert(fromUserId, 'Need to provide fromUserId');
  assert(toUserId, 'Need to provide toUserId');

  fromUserId = mongoUtils.asObjectID(fromUserId);
  toUserId = mongoUtils.asObjectID(toUserId);

  if (mongoUtils.objectIDsEqual(fromUserId, toUserId)) throw new StatusError(417); // You cannot be in a troupe with yourself.

  var query = getOneToOneRoomQuery(fromUserId, toUserId);

  /* Find the existing one-to-one.... */
  return persistence.Troupe.findOne(query).exec();
}

function findOneToOneRoomsForUserId(userId) {
  assert(userId, 'userId required');

  return persistence.Troupe.find({
    oneToOne: true,
    oneToOneUsers: {
      $elemMatch: {
        userId: mongoUtils.asObjectID(userId)
      }
    }
  })
    .lean()
    .exec();
}

/**
 * Internal method.

 * Returns [troupe, existing]
 */
function upsertNewOneToOneRoom(userId1, userId2) {
  var query = getOneToOneRoomQuery(userId1, userId2);

  // Second attempt is an upsert
  var insertFields = {
    oneToOne: true,
    status: 'ACTIVE',
    githubType: 'ONETOONE',
    groupId: null, // One-to-ones are never in a group
    oneToOneUsers: [
      {
        _id: new ObjectID(),
        userId: userId1
      },
      {
        _id: new ObjectID(),
        userId: userId2
      }
    ],
    userCount: 0,
    sd: {
      type: 'ONE_TO_ONE',
      public: false // One-to-ones are always private
    }
  };

  debug('Attempting upsert for new one-to-one room');

  // Upsert returns [model, existing] already
  return mongooseUtils.upsert(Troupe, query, {
    $setOnInsert: insertFields
  });
}

function addOneToOneMemberToRoom(troupeId, userId) {
  // Deal with https://github.com/troupe/gitter-webapp/issues/1227
  return userDefaultFlagsService.getDefaultFlagsOneToOneForUserId(userId).then(function(flags) {
    return roomMembershipService.addRoomMember(troupeId, userId, flags, null);
  });
}

/**
 * Ensure that the current user is in the one-to-one room
 */
function ensureUsersInRoom(troupeId, fromUserId, toUserId) {
  return roomMembershipService
    .findMembershipForUsersInRoom(troupeId, [fromUserId, toUserId])
    .then(function(userIds) {
      // Both members are in the room
      if (userIds.length === 2) return;

      var fromUserInRoom = userIds.some(function(userId) {
        return mongoUtils.objectIDsEqual(userId, fromUserId);
      });

      var toUserInRoom = userIds.some(function(userId) {
        return mongoUtils.objectIDsEqual(userId, toUserId);
      });

      debug('Re-adding users to room: fromUser=%s, toUser=%s', fromUserInRoom, toUserInRoom);

      return Promise.all([
        !fromUserInRoom && addOneToOneMemberToRoom(troupeId, fromUserId),
        !toUserInRoom && addOneToOneMemberToRoom(troupeId, toUserId)
      ]);
    });
}

/**
 * Ensure that both users are in the one-to-one room
 */
function addOneToOneUsersToNewRoom(troupeId, fromUserId, toUserId) {
  return userDefaultFlagsService
    .getDefaultOneToOneFlagsForUserIds([fromUserId, toUserId])
    .then(function(userFlags) {
      var fromUserFlags = userFlags[fromUserId];
      var toUserFlags = userFlags[toUserId];

      if (!fromUserFlags) throw new StatusError(404);
      if (!toUserFlags) throw new StatusError(404);

      return Promise.join(
        roomMembershipService.addRoomMember(troupeId, fromUserId, fromUserFlags, null),
        roomMembershipService.addRoomMember(troupeId, toUserId, toUserFlags, null)
      );
    });
}

/**
 * Find a one-to-one troupe, otherwise create it
 *
 * @return {[ troupe, other-user ]}
 */
function findOrCreateOneToOneRoom(fromUser, toUserId) {
  assert(fromUser, 'Need to provide fromUser');
  assert(fromUser._id, 'fromUser invalid');
  assert(toUserId, 'Need to provide toUserId');

  var fromUserId = fromUser._id;
  toUserId = mongoUtils.asObjectID(toUserId);

  return userService
    .findById(toUserId)
    .bind({
      toUser: undefined,
      troupe: undefined
    })
    .then(function(toUser) {
      if (!toUser) throw new StatusError(404, 'User does not exist');
      this.toUser = toUser;
      return findOneToOneRoom(fromUserId, toUserId);
    })
    .then(function(existingRoom) {
      if (existingRoom) {
        return [existingRoom, true];
      }

      var toUser = this.toUser;

      // TODO: in future we need to add request one-to-one here...
      return policyFactory
        .createPolicyForOneToOne(fromUser, toUser)
        .then(function(policy) {
          return policy.canJoin();
        })
        .then(function(canJoin) {
          if (!canJoin) {
            var err = new StatusError(404);
            err.githubType = 'ONETOONE';
            err.uri = toUser.username;
            throw err;
          }

          return upsertNewOneToOneRoom(fromUserId, toUserId);
        });
    })
    .spread(function(troupe, isAlreadyExisting) {
      debug('findOrCreate isAlreadyExisting=%s', isAlreadyExisting);

      var troupeId = troupe._id;
      this.troupe = troupe;

      if (isAlreadyExisting) {
        return ensureUsersInRoom(troupeId, fromUserId, toUserId);
      } else {
        stats.event('new_troupe', {
          troupeId: troupeId,
          oneToOne: true,
          userId: fromUserId
        });

        return addOneToOneUsersToNewRoom(troupeId, fromUserId, toUserId);
      }
    })
    .then(function() {
      return [this.troupe, this.toUser];
    });
}

/* Exports */
module.exports = {
  findOrCreateOneToOneRoom: Promise.method(findOrCreateOneToOneRoom),
  findOneToOneRoom: Promise.method(findOneToOneRoom),
  findOneToOneRoomsForUserId: findOneToOneRoomsForUserId
};
