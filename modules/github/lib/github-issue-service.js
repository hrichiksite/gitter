'use strict';

var StatusError = require('statuserror');
var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;

function standardizeResponse(response) {
  return {
    id: response.id,
    iid: response.number,
    title: response.title,
    body: response.body,
    state: response.state,
    labels: (response.labels || []).map(function(label) {
      return label.name;
    }),
    author: response.user && {
      id: response.user.id,
      username: response.user.login,
      //displayName: n/a,
      avatarUrl: response.user.avatar_url
    },
    assignee: response.assignee && {
      id: response.assignee.id,
      username: response.assignee.login,
      //displayName: n/a,
      avatarUrl: response.assignee.avatar_url
    },
    createdAt: response.created_at,
    updatedAt: response.updated_at
  };
}

function GitHubIssueService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

GitHubIssueService.prototype.getIssue = function(repo, issueNumber) {
  return tentacles.issue
    .get(repo, issueNumber, { accessToken: this.accessToken })
    .then(response => {
      if (response) {
        return standardizeResponse(response);
      }

      throw new StatusError(404, `Unable to fetch GitHub issue ${repo}#${issueNumber}`);
    });
};

module.exports = wrap(GitHubIssueService, function() {
  return [this.accessToken || ''];
});
