/* eslint complexity: ["error", 15] */

'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const StatusError = require('statuserror');

const env = require('gitter-web-env');
const stats = env.stats;
const errorReporter = env.errorReporter;
const logger = env.logger.get('chat');

const mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
const persistence = require('gitter-web-persistence');
const ChatMessage = persistence.ChatMessage;
const ChatMessageBackup = persistence.ChatMessageBackup;
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
const chatSpamDetection = require('gitter-web-spam-detection/lib/chat-spam-detection');
const collections = require('gitter-web-utils/lib/collections');
const processText = require('gitter-web-text-processor');
const getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
const groupResolver = require('./group-resolver');
const userService = require('gitter-web-users');
const chatSearchService = require('./chat-search-service');
const unreadItemService = require('gitter-web-unread-items');
const recentRoomService = require('gitter-web-rooms/lib/recent-room-service');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];

var useHints = true;

const validateChatMessageLength = m => {
  if (m.length > 4096) throw new StatusError(400, 'Message exceeds maximum size');
};

var CURRENT_META_DATA_VERSION = markdownMajorVersion;

// If you edit this, you need to update the client too.
/* @const */
var MAX_CHAT_EDIT_AGE_SECONDS = 600;

const DEFAULT_CHAT_MESSAGE_RESULTS = 50;
const MAX_CHAT_MESSAGE_RESULTS = 100;

/**
 * Milliseconds considered 'recent'
 */
var RECENT_WINDOW_MILLISECONDS = 60 * 60 * 1000; // 1 hour

var ObjectID = require('mongodb').ObjectID;

function excludingUserId(userId) {
  userId = String(userId);
  return function(u) {
    return String(u) !== userId;
  };
}

/* Resolve userIds for mentions */
function resolveMentions(troupe, user, parsedMessage) {
  if (!parsedMessage.mentions || !parsedMessage.mentions.length) {
    return Promise.resolve([]);
  }

  /* Look through the mentions and attempt to tie the mentions to userIds */
  var mentionUserNames = parsedMessage.mentions
    .filter(function(m) {
      return !m.group;
    })
    .map(function(mention) {
      return mention.screenName;
    });

  var mentionGroupNames = parsedMessage.mentions
    .filter(function(m) {
      return m.group;
    })
    .map(function(mention) {
      return mention.screenName;
    });

  var userLookup = mentionUserNames.length ? userService.findByUsernames(mentionUserNames) : [];

  var groupLookup = mentionGroupNames.length ? groupResolver(troupe, user, mentionGroupNames) : [];

  return Promise.join(userLookup, groupLookup, function(users, groups) {
    var notCurrentUserPredicate = excludingUserId(user.id);

    var usersIndexed = collections.indexByProperty(users, 'username');

    // Lookup the userIds for a mention
    return parsedMessage.mentions
      .map(function(mention) {
        if (mention.group) {
          var groupInfo = groups[mention.screenName];
          if (!groupInfo) {
            return null;
          }

          var groupUserIds = groupInfo.userIds || [];

          return {
            screenName: mention.screenName,
            group: true,
            announcement: groupInfo.announcement || undefined,
            userIds: groupUserIds.filter(notCurrentUserPredicate)
          };
        }

        // Not a group mention
        var mentionUser = usersIndexed[mention.screenName];
        var userId = mentionUser && mentionUser.id;

        return {
          screenName: mention.screenName,
          userId: userId
        };
      })
      .filter(function(f) {
        return !!f;
      });
  });
}

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const messageCursor = ChatMessage.find({
    fromUserId: userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return messageCursor;
}

async function addToThreadMessageCount(parentId, troupeId, count) {
  const parent = await ChatMessage.findById(parentId).exec();
  if (!parent || !mongoUtils.objectIDsEqual(parent.toTroupeId, troupeId)) {
    throw new StatusError(400, `Parent message ${parentId} doesn't exist in troupe ${troupeId}`);
  }
  const currentValue = parent.threadMessageCount || 0;
  parent.threadMessageCount = Math.max(0, currentValue + count); // safe guard against decrementing below 0
  return parent.save();
}

/**
 * Create a new chat and return a promise of the chat.
 *
 * NB: it is the callers responsibility to ensure that the user has permission
 * to chat in the room
 */
async function newChatMessageToTroupe(troupe, user, data) {
  // Keep this up here, set sent time asap to ensure order
  const sentAt = new Date();

  if (!troupe) throw new StatusError(404, 'Unknown room');

  /* You have to have text */
  if (!data.text) throw new StatusError(400, 'Text is required');
  validateChatMessageLength(data.text);
  if (data.parentId && !mongoUtils.isLikeObjectId(data.parentId))
    throw new StatusError(400, 'parentId must be a valid message ID');

  if (data.parentId) {
    await addToThreadMessageCount(data.parentId, troupe.id, 1);
  }
  const parsedMessage = await processText(data.text);
  const mentions = await resolveMentions(troupe, user, parsedMessage);

  const isPublic = securityDescriptorUtils.isPublic(troupe);

  const chatMessage = new ChatMessage({
    fromUserId: user.id,
    toTroupeId: troupe.id,
    parentId: data.parentId,
    sent: sentAt,
    text: data.text, // Keep the raw message.
    status: data.status, // Checks if it is a status update
    pub: isPublic || undefined, // Public room - useful for sampling
    html: parsedMessage.html,
    lang: parsedMessage.lang,
    urls: parsedMessage.urls,
    mentions: mentions,
    issues: parsedMessage.issues,
    _md: parsedMessage.markdownProcessingFailed
      ? -CURRENT_META_DATA_VERSION
      : CURRENT_META_DATA_VERSION
  });

  // hellban for users
  // dont write message to db, just fake it for the troll / asshole
  const isSpamming = await chatSpamDetection.detect(user, parsedMessage);
  if (isSpamming) {
    return chatMessage;
  }

  await chatMessage.save();
  const lastAccessTime = mongoUtils.getDateFromObjectId(chatMessage._id);

  recentRoomService
    .saveLastVisitedTroupeforUserId(user._id, troupe._id, {
      lastAccessTime: lastAccessTime
    })
    .catch(function(err) {
      errorReporter(
        err,
        { operation: 'recentRoomService.saveLastVisitedTroupeforUserId', chat: chatMessage },
        { module: 'chat-service' }
      );
    })
    .done();

  // Async add unread items
  unreadItemService
    .createChatUnreadItems(user.id, troupe, chatMessage)
    .catch(function(err) {
      errorReporter(
        err,
        { operation: 'unreadItemService.createChatUnreadItems', chat: chatMessage },
        { module: 'chat-service' }
      );
    })
    .done();

  const statMetadata = _.extend(
    {
      userId: user.id,
      troupeId: troupe.id,
      groupId: troupe.groupId,
      username: user.username,
      room_uri: troupe.uri,
      owner: getOrgNameFromTroupeName(troupe.uri)
    },
    data.stats
  );

  stats.event('new_chat', statMetadata);
  if (chatMessage.parentId) {
    stats.event('new_thread_chat', statMetadata);
  }

  return chatMessage;
}

// Returns some recent public chats
function getRecentPublicChats() {
  var minRecentTime = Date.now() - RECENT_WINDOW_MILLISECONDS;
  var minId = mongoUtils.createIdForTimestamp(minRecentTime);

  var aggregation = [
    {
      $match: {
        _id: { $gt: minId },
        pub: true
      }
    },
    {
      $sample: {
        size: 100
      }
    },
    {
      $sort: {
        _id: -1
      }
    }
  ];

  return ChatMessage.aggregate(aggregation)
    .read(mongoReadPrefs.secondaryPreferred)
    .exec();
}

/**
 * NB: It is the callers responsibility to ensure that the user has access to the room!
 */
async function updateChatMessage(troupe, chatMessage, user, newText = '') {
  validateChatMessageLength(newText);

  const age = (Date.now() - chatMessage.sent.valueOf()) / 1000;
  if (age > MAX_CHAT_EDIT_AGE_SECONDS) {
    throw new StatusError(400, 'You can no longer edit this message');
  }

  chatMessage.text = newText;
  const parsedMessage = await processText(newText);
  const mentions = await resolveMentions(troupe, user, parsedMessage);

  chatMessage.html = parsedMessage.html;
  chatMessage.editedAt = new Date();
  chatMessage.lang = parsedMessage.lang;

  // Metadata
  chatMessage.urls = parsedMessage.urls;
  const originalMentions = chatMessage.mentions;
  chatMessage.mentions = mentions;
  chatMessage.issues = parsedMessage.issues;
  chatMessage._md = parsedMessage.markdownProcessingFailed
    ? -CURRENT_META_DATA_VERSION
    : CURRENT_META_DATA_VERSION;

  await chatMessage.save();

  // Async add unread items
  unreadItemService
    .updateChatUnreadItems(user.id, troupe, chatMessage, originalMentions)
    .catch(function(err) {
      errorReporter(
        err,
        { operation: 'unreadItemService.updateChatUnreadItems', chat: chatMessage },
        { module: 'chat-service' }
      );
    });

  stats.event('edit_chat', {
    userId: user.id,
    troupeId: troupe.id,
    username: user.username
  });

  return chatMessage;
}

function findById(id, callback) {
  return ChatMessage.findById(id)
    .exec()
    .nodeify(callback);
}

function findByIdLean(id, fields) {
  return ChatMessage.findById(id, fields)
    .lean()
    .exec();
}

function findByIdInRoom(troupeId, id, callback) {
  return ChatMessage.findOne({ _id: id, toTroupeId: troupeId })
    .exec()
    .nodeify(callback);
}

/**
 * Returns a promise of chats with given ids
 */
function findByIds(ids) {
  return mongooseUtils.findByIds(ChatMessage, ids);
}

/* This is much more cacheable than searching less than a date */
function getDateOfFirstMessageInRoom(troupeId) {
  return ChatMessage.where('toTroupeId', troupeId)
    .limit(1)
    .select({ _id: 0, sent: 1 })
    .sort({ sent: 'asc' })
    .lean()
    .exec()
    .then(function(r) {
      if (!r.length) return null;
      return r[0].sent;
    });
}

function findFirstUnreadMessageId(troupeId, userId) {
  return unreadItemService.getFirstUnreadItem(userId, troupeId);
}

/**
 * Mongo timestamps have a resolution down to the second, whereas
 * sent times have a resolution down to the millisecond.
 * To ensure that there is an overlap, we need to slightly
 * extend the search range using these two functions.
 */
function sentBefore(objectId) {
  return new Date(objectId.getTimestamp().valueOf() + 1000);
}

function sentAfter(objectId) {
  return new Date(objectId.getTimestamp().valueOf() - 1000);
}

function addBeforeFilter(query, beforeId) {
  // Also add sent as this helps mongo by using the { troupeId, sent } index
  // For some reason, mongodb doesn't do an index intersection on {_id} and {troupeId, sent} index
  // and because the `_id` condition is used in the filter stage, it really does help
  // to filter on `sent` to limit the amount of results ¯\_(ツ)_/¯
  // It does, however, mean that the timestamp from _id needs to match the sent date otherwise one of
  // the filters (beforeId or afterId) misses the message
  query.where('sent').lte(sentBefore(new ObjectID(beforeId)));
  query.where('_id').lt(new ObjectID(beforeId));
}

function addAfterFilter(query, afterId) {
  // See addBeforeFilter comment above
  query.where('sent').gte(sentAfter(new ObjectID(afterId)));
  query.where('_id').gt(new ObjectID(afterId));
}

const validateSearchLimit = rawLimit =>
  Math.min(rawLimit || DEFAULT_CHAT_MESSAGE_RESULTS, MAX_CHAT_MESSAGE_RESULTS);

/**
 * Finds all messages for thread message feed represented by parentId.
 *
 * @param {String|ObjectID} troupeId room in which the parent message is.
 *         This is used solely for security purposes (clients need to ensure users
 *         have access to this room)
 * @param {String|ObjectID} parentId
 *
 * @returns Array of last MAX_CHAT_MESSAGE_RESULTS messages in ascending order
 */
async function findThreadChatMessages(troupeId, parentId, { beforeId, afterId, limit } = {}) {
  const q = ChatMessage.where('toTroupeId', troupeId);
  q.where('parentId', parentId);

  if (beforeId) addBeforeFilter(q, beforeId);
  if (afterId) addAfterFilter(q, afterId);

  // Reverse the initial order for afterId
  const sentOrder = afterId ? 'asc' : 'desc';
  q.sort({ sent: sentOrder });

  q.limit(validateSearchLimit(limit));

  const messages = await q.lean().exec();
  mongooseUtils.addIdToLeanArray(messages);
  if (sentOrder === 'desc') messages.reverse();
  return messages;
}

async function findChatMessagesInRange(
  troupeId,
  { beforeId, beforeInclId, afterId, sort, readPreference, limit, skip, includeThreads } = {}
) {
  const validatedSkip = skip || 0;

  if (validatedSkip > 5000) {
    throw new StatusError(
      400,
      'Skip is limited to 5000 items. Please use beforeId rather than skip. See https://developer.gitter.im'
    );
  }
  let q = ChatMessage.where('toTroupeId', troupeId);

  if (beforeId) addBeforeFilter(q, beforeId);

  if (beforeInclId) {
    // Also add sent as this helps mongo by using the { troupeId, sent } index
    q = q.where('sent').lte(sentBefore(new ObjectID(beforeInclId)));
    q = q.where('_id').lte(new ObjectID(beforeInclId)); // Note: less than *or equal to*
  }
  if (afterId) addAfterFilter(q, afterId);
  // inline-threads-for-mobile-embedded
  if (!includeThreads) {
    q.where('parentId').exists(false);
  }
  if (useHints) {
    q.hint({ toTroupeId: 1, sent: -1 });
  }

  // Reverse the initial order for afterId
  const sentOrder = afterId ? 'asc' : 'desc';
  q = q.sort(sort || { sent: sentOrder }).limit(validateSearchLimit(limit));

  if (validatedSkip) {
    if (validatedSkip > 1000) {
      logger.warn(
        'chat-service: Client requested large skip value on chat message collection query',
        { troupeId: troupeId, skip: validatedSkip }
      );
    }

    q = q.skip(validatedSkip);

    if (!readPreference) {
      q = q.read(mongoReadPrefs.secondaryPreferred);
    }
  }

  if (readPreference) {
    q = q.read(readPreference);
  }

  return q
    .lean()
    .exec()
    .then(function(results) {
      mongooseUtils.addIdToLeanArray(results);

      if (sentOrder === 'desc') {
        results.reverse();
      }

      return results;
    });
}

async function findChatMessagesAroundId(troupeId, markerId, { aroundId, limit, includeThreads }) {
  const message = await findByIdLean(markerId || aroundId);

  // if the message doesn't exist, just return last 50 messages in the room
  if (!message) return findChatMessagesInRange(troupeId);

  // if the around message is child message in a thread, we are going to searching around parent
  const searchMessageId = new ObjectID(message.parentId || message._id);

  const halfLimit = Math.floor(validateSearchLimit(limit) / 2);

  const q1 = ChatMessage.where('toTroupeId', troupeId)
    .where('sent')
    .lte(sentBefore(searchMessageId))
    .where('_id')
    .lte(searchMessageId);
  if (!includeThreads) {
    // inline-threads-for-mobile-embedded
    q1.where('parentId').exists(false);
  }
  q1.sort({ sent: 'desc' })
    .lean()
    .limit(halfLimit);

  const q2 = ChatMessage.where('toTroupeId', troupeId)
    .where('sent')
    .gte(sentAfter(searchMessageId))
    .where('_id')
    .gt(searchMessageId);
  if (!includeThreads) {
    // inline-threads-for-mobile-embedded
    q2.where('parentId').exists(false);
  }
  q2.sort({ sent: 'asc' })
    .lean()
    .limit(halfLimit);

  if (useHints) {
    q1.hint({ toTroupeId: 1, sent: -1 });
    q2.hint({ toTroupeId: 1, sent: -1 });
  }

  /* Around case */
  const [before, after] = await Promise.all([q1.exec(), q2.exec()]);
  const childMessageArray = message.parentId ? [message] : [];

  // adding the child message for clients to be able to reference it
  const result = [...before.reverse(), ...after, ...childMessageArray];
  mongooseUtils.addIdToLeanArray(result);
  return result;
}

/**
 * Returns a promise of messages
 */
async function findChatMessagesForTroupe(troupeId, options = {}) {
  let markerId;
  if (options.marker === 'first-unread' && options.userId) {
    markerId = await findFirstUnreadMessageId(troupeId, options.userId);
  }

  if (!markerId && !options.aroundId) {
    return findChatMessagesInRange(troupeId, options);
  } else {
    return findChatMessagesAroundId(troupeId, markerId, options);
  }
}

// limiting the results to 1,500 messages because the page becomes unusable with larger number
// in the future this limiting should be solved by archive pagination
// https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2536
const ARCHIVE_MESSAGE_LIMIT = 1500;

function logWarningForLargeArchive(troupeId, startDate, endDate) {
  return queryResult => {
    if (queryResult.length >= ARCHIVE_MESSAGE_LIMIT) {
      logger.warn(
        `Archive message display limit (${ARCHIVE_MESSAGE_LIMIT}) reached (room=${troupeId}, dateRange=${startDate} - ${endDate}). ` +
          `We limit the number of messages because of MongoDB performance and because the frontend isn't responsive after 1000 messages.`
      );
    }
    return queryResult;
  };
}
function findChatMessagesForTroupeForDateRange(troupeId, startDate, endDate) {
  var q = ChatMessage.where('toTroupeId', troupeId)
    .where('sent')
    .gte(startDate)
    .where('sent')
    .lte(endDate)
    .limit(ARCHIVE_MESSAGE_LIMIT)
    .sort({ sent: 'asc' });

  // Prefer reading from a replica, since archives are not changing and they don't need realtime data
  return q
    .read(mongoReadPrefs.secondaryPreferred)
    .exec()
    .then(logWarningForLargeArchive(troupeId, startDate, endDate));
}

/**
 * Search for messages in a room using a full-text index.
 *
 * Returns promise messages
 */
function searchChatMessagesForRoom(troupeId, textQuery, options) {
  return chatSearchService
    .searchChatMessagesForRoom(troupeId, textQuery, options)
    .then(function(searchResults) {
      // We need to maintain the order of the original results
      if (searchResults.length === 0) return [];

      var ids = searchResults.map(function(result) {
        return result.id;
      });

      return findByIds(ids).then(function(chats) {
        // Keep the order the same as the original search results
        var chatsIndexed = collections.indexById(chats);
        var chatsOrdered = searchResults
          .map(function(result) {
            var chat = chatsIndexed[result.id];
            if (chat) {
              chat.highlights = result.highlights;
            }
            return chat;
          })
          .filter(function(f) {
            return !!f;
          });

        return chatsOrdered;
      });
    });
}

async function deleteMessage(message) {
  // parent message won't be completely deleted till it's got threaded messages
  if (message.threadMessageCount > 0) {
    message.text = '';
    message.html = '';
    return message.save();
  }
  // `_.omit` because of `Cannot update '__v' and '__v' at the same time` error
  await mongooseUtils.upsert(
    ChatMessageBackup,
    { _id: message._id },
    _.omit(message.toObject(), '__v')
  );
  await message.remove();
  if (message.parentId) {
    await addToThreadMessageCount(message.parentId, message.toTroupeId, -1);
  }
}

async function deleteMessageFromRoom(room, chatMessage) {
  await unreadItemService.removeItem(chatMessage.fromUserId, room, chatMessage);
  await deleteMessage(chatMessage);
}

async function removeAllMessagesForUserId(userId) {
  const messages = await ChatMessage.find({ fromUserId: userId }).exec();
  logger.info(
    'removeAllMessagesForUserId(' + userId + '): Removing ' + messages.length + ' messages'
  );
  const troupeMap = {};
  const getTroupe = async id => {
    if (troupeMap[id]) return troupeMap[id];
    const troupe = await troupeService.findById(id);
    troupeMap[troupe._id] = troupe;
    return troupe;
  };
  // Clear any unreads and delete the messages
  for (const message of messages) {
    const troupe = await getTroupe(message.toTroupeId);
    await deleteMessageFromRoom(troupe, message);
  }
}

function removeAllMessagesForUserIdInRoomId(userId, roomId) {
  return Promise.props({
    room: troupeService.findById(roomId),
    messages: ChatMessage.find({ toTroupeId: roomId, fromUserId: userId }).exec()
  }).then(function({ room, messages }) {
    return Promise.map(messages, message => deleteMessageFromRoom(room, message), {
      concurrency: 1
    });
  });
}

const testOnly = {
  setUseHints: function(value) {
    useHints = value;
  }
};

module.exports = {
  getCursorByUserId,
  newChatMessageToTroupe,
  getRecentPublicChats,
  updateChatMessage,
  findById,
  findByIdLean,
  findByIdInRoom,
  findByIds,
  getDateOfFirstMessageInRoom,
  findChatMessagesForTroupe,
  findChatMessagesForTroupeForDateRange,
  findThreadChatMessages,
  searchChatMessagesForRoom,
  removeAllMessagesForUserId,
  removeAllMessagesForUserIdInRoomId,
  deleteMessageFromRoom,
  testOnly
};
