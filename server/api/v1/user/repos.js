'use strict';

var restful = require('../../../services/restful');
var restSerializer = require('../../../serializers/rest-serializer');
var repoService = require('../../../services/repo-service');
var createTextFilter = require('text-filter');
var StatusError = require('statuserror');

function indexQuery(req) {
  var limit = parseInt(req.query.limit, 10) || 0;

  return repoService.getReposForUser(req.user).then(function(repos) {
    var query = (req.query.q || '').replace(/\*|\+|\$/g, '');
    var filteredRepos = repos.filter(createTextFilter({ query: query, fields: ['full_name'] }));

    var strategyOptions = { currentUserId: req.user.id };
    // if (req.query.include_users) strategyOptions.mapUsers = true;

    var strategy = new restSerializer.SearchResultsStrategy({
      resultItemStrategy: new restSerializer.GithubRepoStrategy(strategyOptions)
    });

    if (limit) {
      filteredRepos = filteredRepos.slice(0, limit + 1);
    }

    return restSerializer.serializeObject({ results: filteredRepos }, strategy);
  });
}

module.exports = {
  id: 'repo',
  index: function(req) {
    if (!req.user) throw new StatusError(401);

    if (req.query.q) {
      return indexQuery(req);
    }

    if (req.query.type === 'admin') {
      return restful.serializeAdminReposForUser(req.user);
    }

    return restful.serializeReposForUser(req.user);
  }
};
