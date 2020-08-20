'use strict';

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;

function GitHubContributorService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

/** Returns an array of usernames of all contributors to a repo */
GitHubContributorService.prototype.getContributors = function(repo, options) {
  return tentacles.repo.listContributors(repo, {
    accessToken: this.accessToken,
    firstPageOnly: options && options.firstPageOnly
  });
};

module.exports = wrap(
  GitHubContributorService,
  function() {
    return ['']; // Cache across all users NB NB NB NB
  },
  {
    policy: 'two-tier',
    hotTTL: 600 /* 10 minutes cache */,
    coldTTL: 14400 /* 4 hours cold cache */,
    coolRefetchTimeout: 0.5 /* max time per call */
  }
);
