'use strict';

var restSerializer = require('../../../serializers/rest-serializer');
var githubGitterUserSearch = require('../../../services/github-gitter-user-search');
var gitterUserSearch = require('../../../services/user-search-service');
var StatusError = require('statuserror');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var userRemovalService = require('gitter-web-rooms/lib/user-removal-service');

module.exports = {
  id: 'resourceUser',
  index: function(req) {
    if (!req.user) {
      throw new StatusError(403);
    }

    if (req.query.q) {
      var searchQuery = req.query.q;
      var user = req.user;
      var searchType = req.query.type;

      var options = {
        limit: parseInt(req.query.limit, 10) || 10,
        skip: parseInt(req.query.skip, 10),
        excludeTroupeId: req.query.excludeTroupeId
      };

      return (searchType === 'gitter'
        ? gitterUserSearch.globalUserSearch(searchQuery, options)
        : githubGitterUserSearch(searchQuery, user, options)
      ).then(function(searchResults) {
        var strategy = new restSerializer.SearchResultsStrategy({
          resultItemStrategy: new restSerializer.UserStrategy()
        });

        return restSerializer.serializeObject(searchResults.results, strategy);
      });
    }

    var strategy = new restSerializer.UserStrategy({ includeProviders: true });
    return restSerializer.serialize([req.user], strategy);
  },

  show: function(req) {
    var strategy = new restSerializer.UserStrategy({ includeProviders: true });
    return restSerializer.serializeObject(req.resourceUser, strategy);
  },

  destroy: async function(req) {
    if (!req.user) throw new StatusError(401);

    let ghost = false;
    if (typeof req.body.ghost === 'boolean') {
      ghost = req.body.ghost;
    }

    await userRemovalService.removeByUsername(req.user.username, {
      ghost: ghost
    });

    return { success: true };
  },

  load: function(req, id) {
    if (!req.user) throw new StatusError(401);

    if (id === 'me') return req.user;

    // TODO: can the currently logged in user view information about this other user?
    // For the moment, you'll only be able to see your own information
    if (!mongoUtils.objectIDsEqual(req.user.id, id)) throw new StatusError(403);

    return req.user;
  },

  subresources: {
    rooms: require('./troupes'),
    orgs: require('./orgs'),
    repos: require('./repos'),
    groups: require('./groups'),
    settings: require('./user-settings'),
    suggestedRooms: require('./suggested-rooms'),
    unreadItems: require('./aggregated-unread-items')
  }
};
