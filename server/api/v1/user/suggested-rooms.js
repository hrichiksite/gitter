'use strict';

var env = require('gitter-web-env');
var config = env.config;
var restSerializer = require('../../../serializers/rest-serializer');
var suggestionsService = require('../../../services/suggestions-service');
var StatusError = require('statuserror');

var EXPIRES_SECONDS = config.get('suggestions:cache-timeout');
var EXPIRES_MILLISECONDS = EXPIRES_SECONDS * 1000;

module.exports = {
  id: 'resourceUserSuggestedRoom',

  index: function(req, res) {
    if (!req.user) throw new StatusError(401);

    return suggestionsService.findSuggestionsForUserId(req.user.id).then(function(suggestedRooms) {
      res.set('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
      res.set('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());

      var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
      return restSerializer.serialize(suggestedRooms, strategy);
    });
  }
};
