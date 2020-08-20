'use strict';

var chatService = require('gitter-web-chats');
var restSerializer = require('../serializers/rest-serializer');
var Promise = require('bluebird');

var cachedSamples = null;
function getSamples() {
  if (cachedSamples) return Promise.resolve(cachedSamples);

  return chatService
    .getRecentPublicChats()
    .then(function(chatMessage) {
      // Remove any duplicate users
      var users = {};
      return chatMessage.filter(function(chatMessage) {
        if (users[chatMessage.fromUserId]) {
          return false;
        }
        users[chatMessage.fromUserId] = true;
        return true;
      });
    })
    .then(function(sampleChatMessages) {
      var sampleChatStrategy = new restSerializer.SampleChatStrategy();
      var results = restSerializer.serialize(sampleChatMessages, sampleChatStrategy);

      cachedSamples = results;

      // Keep them cached for 30 seconds
      setTimeout(function() {
        cachedSamples = null;
      }, 30000);

      return results;
    });
}

module.exports = {
  getSamples: getSamples
};
