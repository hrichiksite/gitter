'use strict';

var groupRoomSuggestions = require('gitter-web-groups/lib/group-room-suggestions');
var restSerializer = require('../../../serializers/rest-serializer');

module.exports = {
  index: function(req) {
    if (!req.group) return [];

    if (!req.user) return [];

    var userId = req.user._id;

    return groupRoomSuggestions
      .findUnjoinedRoomsInGroup(req.group._id, userId)
      .then(function(suggestions) {
        var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
        return restSerializer.serialize(suggestions, strategy);
      });
  }
};
