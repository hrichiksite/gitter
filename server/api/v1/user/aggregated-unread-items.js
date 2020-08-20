'use strict';

var unreadItemService = require('gitter-web-unread-items');
var collections = require('gitter-web-utils/lib/collections');
var restSerializer = require('../../../serializers/rest-serializer');

module.exports = {
  id: 'aggregatedUnreadItem',
  index: function(req) {
    var userId = req.resourceUser.id;

    return unreadItemService.getAllUnreadItemCounts(userId).then(function(counts) {
      var troupeIds = counts.map(function(c) {
        return c.troupeId;
      });

      var strategy = new restSerializer.TroupeIdStrategy({
        currentUserId: userId,
        skipUnreadCounts: true
      });

      return restSerializer.serialize(troupeIds, strategy).then(function(troupes) {
        var troupesIndexed = collections.indexById(troupes);

        var results = [];
        counts.forEach(function(count) {
          var troupe = troupesIndexed[count.troupeId];
          if (troupe) {
            results.push({
              id: troupe.id,
              uri: troupe.uri,
              unreadItems: count.unreadItems,
              mentions: count.mentions
            });
          }
        });

        return results;
      });
    });
  }
};
