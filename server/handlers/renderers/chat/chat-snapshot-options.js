'use strict';
const fixMongoIdQueryParam = require('../../../web/fix-mongo-id-query-param');
const unreadItemService = require('gitter-web-unread-items');

/* How many chats to send back */
const INITIAL_CHAT_COUNT = 50;

const getPermalinkMessageId = request => fixMongoIdQueryParam(request.query.at);

/* which messages and how many of them should be fetched */
const getChatSnapshotOptions = async (userId, troupeId, req) => {
  // It's ok if there's no user (logged out), unreadItems will be 0
  const unreadItems = await unreadItemService.getUnreadItemsForUser(userId, troupeId);

  const limit =
    unreadItems.chat.length > INITIAL_CHAT_COUNT
      ? unreadItems.chat.length + 20
      : INITIAL_CHAT_COUNT;

  return {
    limit,
    aroundId: getPermalinkMessageId(req),
    // inline-threads-for-mobile-embedded
    includeThreads: false // the server side page rendering is never used for native mobile clients
  };
};

module.exports = getChatSnapshotOptions;
