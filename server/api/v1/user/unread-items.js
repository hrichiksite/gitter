'use strict';

var unreadItemService = require('gitter-web-unread-items');
var recentRoomService = require('gitter-web-rooms/lib/recent-room-service');
var StatusError = require('statuserror');
var uniqueIds = require('mongodb-unique-ids');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

module.exports = {
  id: 'unreadItem',
  index: function(req) {
    var userId = req.resourceUser.id;

    return unreadItemService.getUnreadItemsForUser(userId, req.params.userTroupeId);
  },

  create: function(req) {
    var unreadItems = req.body;
    if (!unreadItems) throw new StatusError(400, 'No body');

    var allIds = [];

    /* TODO: remove mentions in February 2015 */
    if (Array.isArray(unreadItems.mention)) allIds = allIds.concat(unreadItems.mention);
    if (Array.isArray(unreadItems.chat)) allIds = allIds.concat(unreadItems.chat);

    if (Array.isArray(unreadItems.mention) && Array.isArray(unreadItems.chat)) {
      allIds = uniqueIds(allIds);
    }

    if (!allIds.length) throw new StatusError(400); /* You comin at me bro? */

    return unreadItemService
      .markItemsRead(req.resourceUser.id, req.params.userTroupeId, allIds)
      .then(function() {
        return { success: true };
      });
  },

  update: function(req) {
    var lastSeenItem = req.unreadItem;
    var lastAccessTime = mongoUtils.getDateFromObjectId(lastSeenItem);
    if (lastAccessTime > new Date()) {
      throw new StatusError(400, 'Invalid last seen item');
    }

    return recentRoomService.saveLastVisitedTroupeforUserId(
      req.resourceUser._id,
      req.params.userTroupeId,
      {
        lastAccessTime: lastAccessTime
      }
    );
  },

  destroy: function(req) {
    if (req.params.unreadItem.toLowerCase() !== 'all') throw new StatusError(404);

    return unreadItemService
      .markAllChatsRead(req.resourceUser.id, req.params.userTroupeId, { member: true })
      .then(function() {
        return { success: true };
      });
  }
};
