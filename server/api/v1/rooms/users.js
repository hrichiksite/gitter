'use strict';

var restful = require('../../../services/restful');
var userService = require('gitter-web-users');
var restSerializer = require('../../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var StatusError = require('statuserror');
var loadTroupeFromParam = require('./load-troupe-param');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');
var Promise = require('bluebird');

var SEARCH_EXPIRES_SECONDS = 60;
var SEARCH_EXPIRES_MILLISECONDS = SEARCH_EXPIRES_SECONDS * 1000;

function getTroupeUserFromId(troupeId, userId) {
  return troupeService
    .findByIdLeanWithMembership(troupeId, userId)
    .spread(function(troupe, isMember) {
      if (!isMember) return;

      return userService.findById(userId);
    });
}

function getTroupeUserFromUsername(troupeId, username) {
  return userService.findByUsername(username).then(function(user) {
    if (!user) return;
    return troupeService
      .findByIdLeanWithMembership(troupeId, user.id)
      .spread(function(troupe, isMember) {
        if (!isMember) return;

        return user;
      });
  });
}

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res) {
    const searchTerm = req.query.q;
    if (typeof searchTerm === 'string') {
      return restful
        .serializeUsersMatchingSearchTerm(req.params.troupeId, searchTerm)
        .then(function(result) {
          res.setHeader('Cache-Control', 'public, max-age=' + SEARCH_EXPIRES_SECONDS);
          res.setHeader(
            'Expires',
            new Date(Date.now() + SEARCH_EXPIRES_MILLISECONDS).toUTCString()
          );
          return result;
        });
    }

    const options = {
      lean: !!req.query.lean,
      skip: parseInt(req.query.skip, 10) || undefined,
      limit: parseInt(req.query.limit, 10) || undefined
    };
    return restful.serializeUsersForTroupe(req.params.troupeId, req.user && req.user.id, options);
  },

  create: function(req) {
    var username = req.body.username;
    if (!username) throw new StatusError(400);
    username = String(req.body.username);
    return Promise.join(loadTroupeFromParam(req), userService.findByUsername(username), function(
      troupe,
      userToAdd
    ) {
      if (!troupe) throw new StatusError(404);

      var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
      return roomWithPolicyService.addUserToRoom(userToAdd).return(userToAdd);
    }).then(function(userToAdd) {
      var strategy = new restSerializer.UserStrategy();
      return restSerializer.serializeObject(userToAdd, strategy);
    });
  },

  /**
   * Removes a member from a room. A user can either request this
   * on their own behalf or delete another person from the room
   * if they have permission
   * DELETE /rooms/:roomId/users/:userId
   */
  destroy: function(req) {
    var userForRemoval = req.resourceTroupeUser;
    if (!req.user) throw new StatusError(401);

    return loadTroupeFromParam(req)
      .then(function(troupe) {
        if (!troupe) throw new StatusError(404);

        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.removeUserFromRoom(userForRemoval);
      })
      .then(function() {
        return { success: true };
      });
  },

  // identifier can be an id or a username. id by default
  // e.g /troupes/:id/users/123456
  // e.g /troupes/:id/users/steve?type=username
  load: function(req, identifier) {
    var troupeId = req.params.troupeId;

    if (req.query.type === 'username') {
      var username = identifier;
      return getTroupeUserFromUsername(troupeId, username);
    }

    if (mongoUtils.isLikeObjectId(identifier)) {
      var userId = identifier;
      return getTroupeUserFromId(troupeId, userId);
    }

    throw new StatusError(404);
  }
};
