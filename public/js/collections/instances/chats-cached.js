'use strict';

var chatModels = require('../chat');
var context = require('gitter-web-client-context');
var unreadItemsClient = require('../../components/unread-items-client');
var errorHandle = require('../../utils/live-collection-error-handle');
var ProxyCollection = require('@gitterhq/backbone-proxy-collection');
var Pool = require('../../components/chat-cache/pool');
var Promise = require('bluebird');
var selectCacheCandidates = require('../../components/chat-cache/select-cache-candidates');
const roomListGenerator = require('../../components/chat-cache/room-list-generator');
const troupeCollections = require('./troupes');

function invokeChatPreload(pool, rooms) {
  var cacheRooms = selectCacheCandidates(pool.size, rooms);

  return Promise.each(cacheRooms, function(room) {
    // Preload the rooms in sequence
    return pool.preload(room.id, room.lastAccessTime);
  });
}

function create() {
  var pool = new Pool(chatModels.ChatCollection, { idAttribute: 'troupeId' });

  var currentRoomId = context.getTroupeId();
  var initialPromise = pool.preload(currentRoomId, Date.now());

  var initial = pool.get(currentRoomId);
  var chatCollection = new ProxyCollection({
    collection: initial,
    klass: chatModels.ChatCollection,
    properties: ['loading']
  });

  context.contextModel().on('change:troupeId', function() {
    var troupeId = context.getTroupeId();

    var newCollection = pool.get(troupeId);
    chatCollection.switchCollection(newCollection);
  });

  chatCollection.on('error', errorHandle.bind(null, 'chat-collection'));

  // Keep the unread items up to date on the model
  // This allows the unread items client to mark model items as read
  if (context.isLoggedIn()) {
    unreadItemsClient.syncCollections({
      chat: chatCollection
    });
  }

  initialPromise.then(function() {
    if (troupeCollections.troupes.length) {
      invokeChatPreload(pool, roomListGenerator(troupeCollections.troupes));
    } else {
      //if we don't have any troupes in the troupeCollection
      //wait for it to sync before posting the message
      troupeCollections.troupes.once('sync', function() {
        invokeChatPreload(pool, roomListGenerator(troupeCollections.troupes));
      });
    }
  });

  return chatCollection;
}

if (context.hasFeature('chat-cache')) {
  const chatCollection = create();
  window._chatCollection = chatCollection;
  module.exports = chatCollection;
} else {
  // If the feature is not turned on, fallback to non-cached chats
  module.exports = require('./chats');
}
