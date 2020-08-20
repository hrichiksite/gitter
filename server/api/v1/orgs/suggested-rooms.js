'use strict';

var restSerializer = require('../../../serializers/rest-serializer');
var util = require('util');
var groupRoomSuggestions = require('gitter-web-groups/lib/group-room-suggestions');
var groupService = require('gitter-web-groups/lib/group-service');

/* TODO: replace this */
module.exports = {
  index: util.deprecate(function(req) {
    if (!req.user) return [];
    var userId = req.user._id;

    return groupService
      .findByUri(req.params.orgName, { lean: true })
      .then(function(group) {
        if (!group) return [];

        return groupRoomSuggestions.findUnjoinedRoomsInGroup(group._id, userId);
      })
      .then(function(suggestions) {
        var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
        return restSerializer.serialize(suggestions, strategy);
      });
  }, '/v1/orgs/:orgName/suggestedRooms is deprecated')
};
