'use strict';

const restSerializer = require('../../../serializers/rest-serializer');
const chatService = require('gitter-web-chats');
const asyncHandler = require('express-async-handler');

module.exports = {
  id: 'thread',

  index: asyncHandler(async req => {
    const userId = req.user && req.user.id;
    const { troupeId, chatMessageId } = req.params;
    const { beforeId, afterId, limit } = req.query;
    const chatMessages = await chatService.findThreadChatMessages(troupeId, chatMessageId, {
      beforeId,
      afterId,
      limit
    });
    const strategy = new restSerializer.ChatStrategy({
      currentUserId: userId,
      troupeId: troupeId
    });

    return restSerializer.serialize(chatMessages, strategy);
  })
};
