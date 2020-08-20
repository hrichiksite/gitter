'use strict';

var wrap = require('./github-cache-wrapper');
var IssueService = require('./github-issue-service');

function GitHubIssueStateService(user) {
  this.issueService = new IssueService(user);
}

GitHubIssueStateService.prototype.getIssueState = function(repo, issueNumber) {
  return this.issueService.getIssue(repo, issueNumber).then(function(issue) {
    return issue.state;
  });
};

module.exports = wrap(GitHubIssueStateService, function() {
  return ['']; // Cache across all users NB NB NB NB
});
