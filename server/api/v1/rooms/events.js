'use strict';

var eventService = require('gitter-web-events');
var restSerializer = require('../../../serializers/rest-serializer');

module.exports = {
  id: 'event',

  index: function(req) {
    var skip = parseInt(req.query.skip, 10) || 0;
    var limit = parseInt(req.query.limit, 10) || 50;
    var beforeId = req.query.beforeId;

    var options = {
      skip: skip,
      beforeId: beforeId ? beforeId : null,
      limit: limit
    };

    return eventService.findEventsForTroupe(req.params.troupeId, options).then(function(events) {
      var strategy = new restSerializer.EventStrategy({
        currentUserId: req.user.id,
        troupeId: req.params.troupeId
      });
      return restSerializer.serialize(events, strategy);
    });
  }
};
