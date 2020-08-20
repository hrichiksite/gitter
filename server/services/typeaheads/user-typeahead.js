'use strict';

var troupeService = require('gitter-web-rooms/lib/troupe-service');
var oneToOneTypeahead = require('./user-typeahead-one-to-one');
var elasticTypeahead = require('./user-typeahead-elastic');
var userSearchService = require('../user-search-service');
var env = require('gitter-web-env');
var errorReporter = env.errorReporter;
var logger = env.logger;

module.exports.query = function(text, options) {
  var roomId = (options || {}).roomId;

  if (roomId) {
    return troupeService.findById(roomId).then(function(room) {
      if (room.oneToOne) {
        return oneToOneTypeahead.query(text, room);
      } else {
        // elastic typeahead doesnt know about oneToOnes
        return alphaFallbackTypeahead(text, { roomId: roomId });
      }
    });
  } else {
    return alphaFallbackTypeahead(text);
  }
};

// while we are using elasticsearch 5 alphas, we better have a fallback
function alphaFallbackTypeahead(text, options) {
  return elasticTypeahead.query(text, options).catch(function(err) {
    logger.error('typeahead alpha experienced an error, falling back to old typeahead', {
      error: err.message
    });
    errorReporter(err, { text: text, options: options }, { module: 'user-typeahead' });

    return oldTypeahead(text, options);
  });
}

function oldTypeahead(text, options) {
  var roomId = (options || {}).roomId || '*';

  if (roomId) {
    return userSearchService.searchForUsersInRoom(text, roomId).then(function(res) {
      return res.results;
    });
  } else {
    return userSearchService.globalUserSearch(text).then(function(res) {
      return res.results;
    });
  }
}
