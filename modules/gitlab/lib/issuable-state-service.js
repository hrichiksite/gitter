'use strict';

var cacheWrapper = require('gitter-web-cache-wrapper');
var IssuableService = require('./issuable-service');
var getGitlabAccessTokenFromUser = require('./get-gitlab-access-token-from-user');

function GitLabIssuableStateService(user, type) {
  this.type = type || 'issues';
  this.issuableService = new IssuableService(user, this.type);
  this.getAccessTokenPromise = getGitlabAccessTokenFromUser(user);
}

GitLabIssuableStateService.prototype.getIssueState = function(project, iid) {
  return this.issuableService.getIssue(project, iid).then(function(issuable) {
    return issuable.state;
  });
};

module.exports = cacheWrapper('GitLabIssuableStateService', GitLabIssuableStateService, {
  getInstanceId: function(gitLabIssuableStateService) {
    return gitLabIssuableStateService.getAccessTokenPromise;
  }
});
