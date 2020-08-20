'use strict';

var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var loadTroupeFromParam = require('./load-troupe-param');
var inviteValidation = require('gitter-web-invites/lib/invite-validation');

module.exports = {
  id: 'roomInvite',

  create: function(req) {
    var input = inviteValidation.parseAndValidateInput(req.body);

    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.createRoomInvitation(
          input.type,
          input.externalId,
          input.emailAddress
        );
      })
      .then(function(result) {
        var avatarUrl = inviteValidation.getAvatar(
          input.type,
          input.externalId,
          result.emailAddress
        );

        if (!result.user) {
          return {
            status: result.status,
            avatarUrl: avatarUrl
          };
        }

        var strategy = new restSerializer.UserStrategy();
        return restSerializer.serializeObject(result.user, strategy).then(function(serializedUser) {
          return {
            status: result.status,
            user: serializedUser,
            avatarUrl: avatarUrl
          };
        });
      });
  }
};
