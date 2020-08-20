'use strict';

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;
var appEvents = require('gitter-web-appevents');

function GitHubRepoService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

/**
 * Returns the information about the specified repo
 * @return the promise of information about a repo
 */
GitHubRepoService.prototype.getRepo = function(repo) {
  return tentacles.repo.get(repo, { accessToken: this.accessToken }).then(function(result) {
    if (!result) return result;
    if (result.full_name && result.full_name !== repo) {
      appEvents.repoRenameDetected(repo, result.full_name);
    }
    return result;
  });
};

/**
 *
 */
GitHubRepoService.prototype.isCollaborator = function(repo, username) {
  return tentacles.repoCollaborator.checkForUser(repo, username, { accessToken: this.accessToken });
};

/**
 *
 */
GitHubRepoService.prototype.getCollaborators = function(repo, options) {
  return tentacles.repoCollaborator.list(repo, {
    accessToken: this.accessToken,
    firstPageOnly: options && options.firstPageOnly
  });
};

/**
 *
 */
GitHubRepoService.prototype.getCommits = function(repo, options) {
  var query = {};

  if (options && options.perPage) {
    query.per_page = options.perPage;
  }

  if (options && options.author) {
    query = { author: options.author };
  }

  return tentacles.repoCommit.list(repo, {
    accessToken: this.accessToken,
    firstPageOnly: options && options.firstPageOnly,
    query: query
  });
};

/**
 *  Returns repo stargazers
 */
GitHubRepoService.prototype.getStargazers = function(repo, options) {
  return tentacles.starring.listForRepo(repo, {
    accessToken: this.accessToken,
    firstPageOnly: options && options.firstPageOnly
  });
};

/**
 * Returns a promise of the issues for a repo
 */
GitHubRepoService.prototype.getIssues = function(repo, options) {
  var query = {
    state: (options && options.state) || 'all'
  };

  return tentacles.issue
    .listForRepo(repo, {
      query: query,
      accessToken: this.accessToken,
      firstPageOnly: options && options.firstPageOnly
    })
    .then(function(returnedIssues) {
      var issues = [];
      returnedIssues.forEach(function(issue) {
        issues[issue.number] = issue;
      });
      return issues;
    });
};

GitHubRepoService.prototype.getRecentlyStarredRepos = function() {
  return tentacles.starring.listForAuthUser({
    accessToken: this.accessToken,
    firstPageOnly: true,
    query: { per_page: 100 }
  });
};

GitHubRepoService.prototype.getWatchedRepos = function() {
  return tentacles.watching.listForAuthUser({ accessToken: this.accessToken });
};

GitHubRepoService.prototype.getAllReposForAuthUser = function() {
  return tentacles.repo.listForAuthUser({
    accessToken: this.accessToken
  });
};

/** TODO: deprecated */
GitHubRepoService.prototype.getReposForUser = function(username, options) {
  var query = {};

  if (options) {
    if (options.type) {
      query.type = options.type;
    }

    if (options.sort) {
      query.sort = options.sort;
    }

    if (options.perPage) {
      query.per_page = options.perPage;
    }
  }

  return tentacles.repo.listForUser(username, {
    accessToken: this.accessToken,
    firstPageOnly: options && options.firstPageOnly,
    query: query
  });
};

module.exports = wrap(GitHubRepoService, function() {
  return [this.accessToken || ''];
});
