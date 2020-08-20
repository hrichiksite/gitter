'use strict';

var { Issues, MergeRequests } = require('gitlab');
var cacheWrapper = require('gitter-web-cache-wrapper');
var avatars = require('gitter-web-avatars');
var getGitlabAccessTokenFromUser = require('./get-gitlab-access-token-from-user');
var getPublicTokenFromPool = require('./get-public-token-from-pool');
const StatusError = require('statuserror');

// eslint-disable-next-line complexity
function standardizeResponse(response) {
  var state = '';
  if (response.state === 'opened' || response.state === 'reopened') {
    state = 'open';
  } else if (response.state === 'closed' || response.state === 'merged') {
    state = 'closed';
  }

  return {
    id: response.id,
    iid: response.iid,
    title: response.title,
    body: response.description,
    state: state,
    labels: response.labels || [],
    author: {
      id: response.author && response.author.id,
      username: response.author && response.author.username,
      displayName: response.author && response.author.name,
      avatarUrl: (response.author && response.author.avatar_url) || avatars.getDefault()
    },
    assignee: response.assignees &&
      response.assignees.length > 0 && {
        id: response.assignees[0].id,
        username: response.assignees[0].username,
        displayName: response.assignees[0].name,
        avatarUrl: response.assignees[0].avatar_url
      },
    createdAt: response.created_at,
    updatedAt: response.updated_at
  };
}

function GitLabIssuableService(user, type) {
  this.type = type || 'issues';
  this.user = user;
  this.getAccessTokenPromise = getGitlabAccessTokenFromUser(user);
}

GitLabIssuableService.prototype.getIssue = function(project, iid) {
  var type = this.type;
  return this.getAccessTokenPromise
    .then(function(accessToken) {
      const gitlabLibOpts = {
        oauthToken: accessToken,
        token: getPublicTokenFromPool()
      };

      var resource = new Issues(gitlabLibOpts);
      if (type === 'mr') {
        resource = new MergeRequests(gitlabLibOpts);
      }

      return resource.show(project, iid);
    })
    .then(standardizeResponse)
    .catch(err => {
      // make sure HTTP errors get translated into StatusErrors so the rest of webapp can handle them
      if (err.name === 'HTTPError') {
        throw new StatusError(err.response.status, err.description);
      }
      throw err;
    });
};

module.exports = cacheWrapper('GitLabIssuableService', GitLabIssuableService, {
  getInstanceId: function(gitLabIssuableService) {
    return gitLabIssuableService.getAccessTokenPromise;
  }
});
