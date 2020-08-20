'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var languageDetector = require('./language-detector');
var languageAnalyzerMapper = require('./language-analyzer-mapper');
var chatsForRoomSearch = require('gitter-web-elasticsearch/lib/chats-for-room-search');
var debug = require('debug')('gitter:app:chat-search-service');

var parseQuery = Promise.method(function(textQuery, userLang) {
  /* Horrible hack - rip a from:xyz field out of the textQuery */
  var fromUser;
  textQuery = textQuery.replace(/\bfrom:('[^']*'|"[^"]*"|[^'"]\w*)/g, function(
    wholeMatch,
    fromField
  ) {
    fromUser = fromField;
    return '';
  });

  if (!textQuery) {
    return {
      queryString: '',
      fromUser: fromUser,
      analyzers: ['default']
    };
  }

  return languageDetector(textQuery).then(function(detectedLanguage) {
    var analyzers = { default: true };

    if (userLang) {
      analyzers[languageAnalyzerMapper(userLang)] = true;
    }

    if (detectedLanguage) {
      analyzers[languageAnalyzerMapper(detectedLanguage)] = true;
    }

    return {
      queryString: textQuery,
      fromUser: fromUser,
      analyzers: Object.keys(analyzers)
    };
  });
});

/**
 * Search for messages in a room using a full-text index.
 *
 * Returns promise messages
 */
exports.searchChatMessagesForRoom = function(troupeId, textQuery, options) {
  if (!options) options = {};

  options = _.defaults(options, {
    limit: 50,
    skip: 0
  });

  return parseQuery(textQuery, options.lang).then(function(parsedQuery) {
    debug('Search: %j', parsedQuery);

    // TODO: deal with limit and skip
    var searchResults = chatsForRoomSearch.searchRoom(troupeId, parsedQuery, options);

    return searchResults;
  });
};
