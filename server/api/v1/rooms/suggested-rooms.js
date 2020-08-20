'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var restSerializer = require('../../../serializers/rest-serializer');
var suggestions = require('gitter-web-suggestions');
var loadTroupeFromParam = require('./load-troupe-param');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var collections = require('gitter-web-utils/lib/collections');
var troupeService = require('gitter-web-rooms/lib/troupe-service');

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: function(req) {
    var userId = req.user._id;

    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return Promise.join(
          suggestions.getSuggestionsForRoom(troupe, req.user),
          userId && roomMembershipService.findRoomIdsForUser(userId),
          function(roomIds, existingRoomIds) {
            if (!roomIds || !roomIds.length) {
              return [];
            }

            if (existingRoomIds) {
              // Remove any existing
              var idMap = collections.hashArray(existingRoomIds);

              roomIds = _.filter(roomIds, function(roomId) {
                return !idMap[roomId];
              });
            }

            roomIds = roomIds.slice(0, 12);
            return troupeService.findByIdsLean(roomIds);
          }
        );
      })
      .then(function(suggestedRooms) {
        var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
        return restSerializer.serialize(suggestedRooms, strategy);
      });
  }
};
