'use strict';

var roomService = require('gitter-web-rooms');
var restSerializer = require('../../../serializers/rest-serializer');
var loadTroupeFromParam = require('./load-troupe-param');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');

module.exports = {
  id: 'troupeBan',

  index: function(req) {
    return loadTroupeFromParam(req).then(function(troupe) {
      var strategy = new restSerializer.TroupeBanStrategy({});
      return restSerializer.serialize(troupe.bans, strategy);
    });
  },

  create: function(req, res) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);

        var username = req.body.username;
        var removeMessages = !!req.body.removeMessages;
        return roomWithPolicyService.banUserFromRoom(username, { removeMessages: removeMessages });
      })
      .then(function(ban) {
        if (!ban) {
          res.status(202);
          return {
            removed: true
          };
        }

        var strategy = new restSerializer.TroupeBanStrategy({});
        return restSerializer.serializeObject(ban, strategy);
      });
  },

  show: function(req) {
    var strategy = new restSerializer.TroupeBanStrategy({});
    return restSerializer.serializeObject(req.troupeBan, strategy);
  },

  destroy: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.unbanUserFromRoom(req.troupeBan.userId);
      })
      .then(function() {
        return { success: true };
      });
  },

  load: function(req, id) {
    return roomService.findBanByUsername(req.params.troupeId, id);
  }
};
