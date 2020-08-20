'use strict';

var _ = require('lodash');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');

function serializeChatToRoom(operation, chat) {
  var url = '/rooms/' + chat.toTroupeId + '/chatMessages';
  var strategy = new restSerializer.ChatStrategy();

  return restSerializer.serializeObject(chat, strategy).then(function(serializedChat) {
    appEvents.dataChange2(url, operation, serializedChat, 'chatMessage');
  });
}

module.exports = {
  create: function(chat) {
    return serializeChatToRoom('create', chat);
  },

  update: function(chat) {
    return serializeChatToRoom('update', chat);
  },

  patch: function(chatId, troupeId, patch) {
    var url = '/rooms/' + troupeId + '/chatMessages';
    var patchMessage = _.extend({}, patch, { id: chatId });
    appEvents.dataChange2(url, 'patch', patchMessage, 'chatMessage');
  },

  remove: function(chat) {
    return this.removeId(chat._id, chat.toTroupeId);
  },

  removeId: function(chatId, troupeId) {
    var url = '/rooms/' + troupeId + '/chatMessages';
    appEvents.dataChange2(url, 'remove', { id: chatId }, 'chatMessage');
  }
};
