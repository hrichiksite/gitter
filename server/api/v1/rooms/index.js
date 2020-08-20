'use strict';

var roomService = require('gitter-web-rooms');
var restful = require('../../../services/restful');
var restSerializer = require('../../../serializers/rest-serializer');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var loadTroupeFromParam = require('./load-troupe-param');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');
var roomContextService = require('gitter-web-rooms/lib/room-context-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function searchRooms(req) {
  var user = req.user;

  var options = {
    limit: parseInt(req.query.limit, 10) || 10,
    skip: parseInt(req.query.skip, 10)
  };

  var userId = user && user.id;
  return roomService.searchRooms(userId, req.query.q, options).then(function(rooms) {
    var strategy = new restSerializer.SearchResultsStrategy({
      resultItemStrategy: new restSerializer.TroupeStrategy({
        currentUserId: userId
      })
    });

    return restSerializer.serializeObject({ results: rooms }, strategy);
  });
}

module.exports = {
  id: 'troupeId',
  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    if (req.query.q) {
      return searchRooms(req);
    }

    return restful.serializeTroupesForUser(req.user.id);
  },

  show: function(req) {
    var strategy = new restSerializer.TroupeIdStrategy({
      currentUserId: req.user && req.user.id,
      includeTags: true,
      includePermissions: true,
      includeGroups: true,
      includeBackend: true,
      includeAssociatedRepo: true
    });

    return restSerializer.serializeObject(req.params.troupeId, strategy);
  },

  /**
   * This endpoint will go under the new communities API.
   *
   * It no longer creates the room, only resolves existing rooms,
   * except in the case of users, for whom it will still
   * create a one-to-one room
   */
  create: function(req) {
    var roomUri = req.query.uri || req.body.uri;
    roomUri = roomUri ? String(roomUri) : undefined;

    if (!roomUri) throw new StatusError(400);

    return roomContextService.findContextForRoom(req.user, roomUri).then(function(room) {
      var strategy = new restSerializer.TroupeStrategy({
        currentUserId: req.user.id,
        currentUser: req.user,
        includeRolesForTroupe: room,
        // include all these because it will replace the troupe in the context
        includeTags: true,
        includeGroups: true
      });

      return restSerializer.serializeObject(room, strategy);
    });
  },

  update: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        var promises = [];
        var updatedTroupe = req.body;

        if (updatedTroupe.autoConfigureHooks) {
          promises.push(roomWithPolicyService.autoConfigureHooks());
        }

        if (updatedTroupe.hasOwnProperty('topic')) {
          promises.push(roomWithPolicyService.updateTopic(updatedTroupe.topic));
        }

        if (updatedTroupe.hasOwnProperty('providers')) {
          promises.push(roomWithPolicyService.updateProviders(updatedTroupe.providers));
        }

        if (updatedTroupe.hasOwnProperty('noindex')) {
          promises.push(roomWithPolicyService.toggleSearchIndexing(updatedTroupe.noindex));
        }

        if (updatedTroupe.hasOwnProperty('tags')) {
          promises.push(roomWithPolicyService.updateTags(updatedTroupe.tags));
        }

        return Promise.all(promises);
      })
      .then(function() {
        var strategy = new restSerializer.TroupeIdStrategy({
          currentUserId: req.user.id,
          currentUser: req.user,
          includePermissions: true,
          includeOwner: true,
          includeGroups: true,
          includeBackend: true
        });

        return restSerializer.serializeObject(req.params.troupeId, strategy);
      });
  },

  destroy: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.deleteRoom();
      })
      .then(function() {
        return { success: true };
      });
  },

  load: function(req, id) {
    var userId = req.user && req.user._id;
    if (!mongoUtils.isLikeObjectId(id)) {
      throw new StatusError(400, 'Invalid MongoId: ' + id);
    }

    return policyFactory
      .createPolicyForRoomId(req.user, id)
      .then(function(policy) {
        // TODO: middleware?
        req.userRoomPolicy = policy;

        return req.method === 'GET' ? policy.canRead() : policy.canWrite();
      })
      .then(function(access) {
        if (access) {
          return id;
        } else {
          throw new StatusError(userId ? 403 : 401);
        }
      });
  },

  subresources: {
    issues: require('./issues'),
    users: require('./users'),
    bans: require('./bans'),
    chatMessages: require('./chat-messages'),
    collaborators: require('./collaborators'),
    suggestedRooms: require('./suggested-rooms'),
    events: require('./events'),
    meta: require('./meta'),
    invites: require('./invites'),
    security: require('./security')
  }
};
