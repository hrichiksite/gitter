'use strict';

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;
var StatusError = require('statuserror');
var Promise = require('bluebird');

function GitHubOrgService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

/**
 * Returns the details of an org
 */
GitHubOrgService.prototype.getOrg = function(org) {
  return tentacles.org.get(org, {
    accessToken: this.accessToken
  });
};

/**
 * Returns the list of users with publisized membership to an organisation
 */
GitHubOrgService.prototype.members = function(org, options) {
  return tentacles.orgMember.listMembers(org, {
    accessToken: this.accessToken,
    firstPageOnly: options && options.firstPageOnly
  });
};

GitHubOrgService.prototype.someMembers = function(org) {
  if (!org) {
    return Promise.reject(new StatusError(500, 'Expected an org'));
  }
  return tentacles.orgMember.listMembers(org, {
    accessToken: this.accessToken,
    firstPageOnly: true
  });
};

GitHubOrgService.prototype.member = function(org, username) {
  return tentacles.orgMember.checkMembershipForUser(org, username, {
    accessToken: this.accessToken
  });
};

GitHubOrgService.prototype.getRepos = function(org) {
  return tentacles.repo.listForOrg(org, {
    accessToken: this.accessToken
  });
};

GitHubOrgService.prototype.getMembership = function(org, username) {
  return tentacles.orgMember.getMembershipForUser(org, username, {
    accessToken: this.accessToken
  });
};

/**
 * Returns a promise of the issues for a repo
 */
GitHubOrgService.prototype.getIssues = function(org, options) {
  var query = {
    state: (options && options.state) || 'all'
  };

  return tentacles.issue
    .listForOrgForAuthUser(org, {
      query: query,
      accessToken: this.accessToken,
      firstPageOnly: !options || options.firstPageOnly !== false
    })
    .then(function(returnedIssues) {
      var issues = [];

      returnedIssues.forEach(function(issue) {
        issues[issue.number] = issue;
      });

      return issues;
    });
};

module.exports = wrap(GitHubOrgService, function() {
  return [this.accessToken || ''];
});
module.exports.raw = GitHubOrgService;
