'use strict';

var troupeService = require('gitter-web-rooms/lib/troupe-service');
var restful = require('../../../services/restful');
var restSerializer = require('../../../serializers/rest-serializer');
var recentRoomService = require('gitter-web-rooms/lib/recent-room-service');
var userRoomModeUpdateService = require('gitter-web-rooms/lib/user-room-mode-update-service');
var roomService = require('gitter-web-rooms');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');

function joinRoom(user, room, policy, options) {
  var roomWithPolicyService = new RoomWithPolicyService(room, user, policy);
  return roomWithPolicyService.joinRoom(options);
}

async function performUpdateToUserRoom(req) {
  var user = req.user;
  if (!user) throw new StatusError(401);

  var userId = user._id;
  var troupeId = req.params.userTroupeId;
  var policy = req.userRoomPolicy;
  const [troupe, isMember] = await troupeService.findByIdLeanWithMembership(troupeId, userId);
  const canJoin = await policy.canJoin();
  if (!isMember && !canJoin) throw new StatusError(403);

  const updatedTroupe = req.body;

  const promises = [];

  if ('favourite' in updatedTroupe) {
    const fav = updatedTroupe.favourite;

    if (!fav || isMember) {
      promises.push(recentRoomService.updateFavourite(userId, troupeId, fav));
    } else {
      // The user has added a favourite that they don't belong to
      // Add them to the room first
      if (!troupe.oneToOne) {
        /* Ignore one-to-one rooms */
        promises.push(
          joinRoom(user, troupe, policy).then(function() {
            return recentRoomService.updateFavourite(userId, troupeId, fav);
          })
        );
      }
    }
  }

  if ('updateLastAccess' in updatedTroupe) {
    promises.push(recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId));
  }

  if ('mode' in updatedTroupe) {
    promises.push(
      userRoomModeUpdateService.setModeForUserInRoom(user, troupeId, updatedTroupe.mode)
    );
  }

  await Promise.all(promises);

  if (req.accepts(['text', 'json']) === 'text') return;

  const strategy = new restSerializer.TroupeIdStrategy({
    currentUserId: userId,
    // include all these because it will replace the troupe in the context
    includeTags: true,
    includeGroups: true
  });

  return restSerializer.serializeObject(req.params.userTroupeId, strategy);
}

module.exports = {
  id: 'userTroupeId',

  index: function(req) {
    if (!req.user) throw new StatusError(401);

    return restful.serializeTroupesForUser(req.resourceUser.id);
  },

  // Join a room
  create: function(req) {
    var user = req.user;
    if (!user) throw new StatusError(401);
    var source;

    if (typeof req.body.source === 'string') {
      source = req.body.source;
    }

    var troupeId = req.body && req.body.id && '' + req.body.id;
    if (!troupeId || !mongoUtils.isLikeObjectId(troupeId)) throw new StatusError(400);

    return troupeService
      .findById(troupeId)
      .then(function(room) {
        return [room, policyFactory.createPolicyForRoom(req.user, room)];
      })
      .spread(function(room, policy) {
        var options = {};

        if (source) {
          options.tracking = { source: source };
        }

        return joinRoom(user, room, policy, options);
      })
      .then(function() {
        var strategy = new restSerializer.TroupeIdStrategy({
          currentUserId: req.user._id,
          currentUser: req.user,
          includePermissions: true,
          includeGroups: true,
          includeBackend: true,
          includeAssociatedRepo: true
        });

        return restSerializer.serializeObject(troupeId, strategy);
      });
  },

  update: function(req) {
    // This route is deprecated
    return performUpdateToUserRoom(req);
  },

  patch: function(req) {
    return performUpdateToUserRoom(req);
  },

  /**
   * Hides a room from the menu. A user can only request this
   * on their own behalf.
   *
   * DELETE /users/:userId/rooms/:roomId
   */
  destroy: function(req) {
    return troupeService
      .findById(req.params.userTroupeId)
      .then(function(troupe) {
        if (!troupe) throw new StatusError(404);

        return roomService.hideRoomFromUser(troupe, req.user._id);
      })
      .then(() => {
        return { success: true };
      });
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return troupeService
      .checkIdExists(id)
      .then(function(exists) {
        if (!exists) throw new StatusError(404);

        return id;
      })
      .tap(function(id) {
        return policyFactory.createPolicyForRoomId(req.user, id).then(function(policy) {
          // TODO: middleware?
          req.userRoomPolicy = policy;
        });
      });
  },

  subresources: {
    settings: require('./troupe-settings'),
    unreadItems: require('./unread-items')
  }
};
