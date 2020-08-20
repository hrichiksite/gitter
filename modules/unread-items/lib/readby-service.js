'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var RedisBatcher = require('gitter-web-utils/lib/redis-batcher').RedisBatcher;
var ChatMessage = require('gitter-web-persistence').ChatMessage;
var assert = require('assert');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var liveCollections = require('gitter-web-live-collection-events');

var batcher = new RedisBatcher('readby2', 600, batchUpdateReadbyBatch);

/**
 * Record items as having been read
 * @return promise of nothing
 */
exports.recordItemsAsRead = function(userId, troupeId, items, callback) {
  return Promise.try(function() {
    assert(userId, 'userId expected');
    assert(items, 'items expected');
    var itemIds = items.chat;
    if (!itemIds || !itemIds.length) return; // Don't bother with anything other than chats for the moment

    var userIdSerialized = mongoUtils.serializeObjectId(userId);
    var userChatIds = itemIds.map(function(chatId) {
      return userIdSerialized + ':' + chatId;
    });

    return Promise.fromCallback(function(callback) {
      batcher.add(troupeId, userChatIds, callback);
    });
  }).nodeify(callback);
};

function batchUpdateReadbyBatch(troupeIdString, userChatIds, done) {
  var troupeId = mongoUtils.asObjectID(troupeIdString);
  var userChatHash = {};

  userChatIds.forEach(function(userChatId) {
    var kp = userChatId.split(':', 2);
    var userIdString = kp[0];
    var chatIdString = kp[1];
    var value = userChatHash[chatIdString];
    if (!value) {
      userChatHash[chatIdString] = [userIdString];
    } else {
      value.push(userIdString);
    }
  });

  var chatIds = Object.keys(userChatHash);
  var chatObjectIds = chatIds.map(mongoUtils.asObjectID);

  return (
    ChatMessage.find(
      {
        _id: { $in: chatObjectIds },
        $or: [{ readBy: { $size: 0 } }, { readBy: { $exists: false } }]
      },
      {
        _id: 1,
        _tv: 1
      },
      {
        lean: true
      }
    )
      // Great candidate for readConcern: major in future
      .exec()
      .then(function(unreadChats) {
        var bulk = ChatMessage.collection.initializeUnorderedBulkOp();

        chatIds.forEach(function(chatIdString, index) {
          var userIdStrings = userChatHash[chatIdString];
          var chatId = chatObjectIds[index];
          var userIds = userIdStrings.map(mongoUtils.asObjectID);

          bulk.find({ _id: chatId, toTroupeId: troupeId }).updateOne({
            $addToSet: { readBy: { $each: userIds } }
          });
        });

        return new Promise(function(resolve, reject) {
          bulk.execute(function(err) {
            if (err) return reject(err);
            resolve(unreadChats);
          });
        });
      })
      .then(function(unreadChats) {
        // If the message was previously not read, send out a
        // notification to clients, but don't update it again
        unreadChats.forEach(function(chat) {
          var chatIdString = mongoUtils.serializeObjectId(chat._id);
          var userIdsReadChat = userChatHash[chatIdString];

          liveCollections.chats.emit('patch', chatIdString, troupeId, {
            readBy: userIdsReadChat.length,
            v: chat._tv ? 0 + chat._tv : undefined
          });
        });
      })
      .catch(function(err) {
        logger.error('batchUpdateReadbyBatch failed: ' + err.message, { exception: err });
        throw err;
      })
      .nodeify(done)
  );
}

exports.listen = function() {
  batcher.listen();
};

exports.testOnly = {
  batchUpdateReadbyBatch: batchUpdateReadbyBatch
};
