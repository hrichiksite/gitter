'use strict';

const debug = require('debug')('gitter:app:gitlab:group-service');
const { Users } = require('gitlab');
const { secureWrapFunction } = require('gitter-web-cache-wrapper');
const getGitlabAccessTokenFromUser = require('./get-gitlab-access-token-from-user');
const getPublicTokenFromPool = require('./get-public-token-from-pool');

function cacheFunction(name, obj) {
  return secureWrapFunction(`GitLabUserService:${name}`, obj, function(GitLabUserService) {
    return GitLabUserService.getAccessTokenPromise;
  });
}

function GitLabUserService(user) {
  this.user = user;
  this.getAccessTokenPromise = getGitlabAccessTokenFromUser(user);
}

GitLabUserService.prototype._getGitlabOpts = async function() {
  const accessToken = await this.getAccessTokenPromise;
  return {
    oauthToken: accessToken,
    token: getPublicTokenFromPool()
  };
};

GitLabUserService.prototype._getUserResource = async function() {
  if (this._groupsResource) {
    return this._groupsResource;
  }

  const gitlabLibOpts = await this._getGitlabOpts();
  this._groupsResource = new Users(gitlabLibOpts);

  return this._groupsResource;
};
GitLabUserService.prototype.getUserById = cacheFunction('getUserById', async function(id) {
  const resource = await this._getUserResource();
  const user = await resource.show(id);
  return user;
});
GitLabUserService.prototype.getUserByUsername = cacheFunction('getUserByUsername', async function(
  username
) {
  const resource = await this._getUserResource();
  const users = await resource.search(username);
  const user = users.find(user => {
    return user.username.toLowerCase() === username.toLowerCase();
  });
  debug(`getUserByUsername(${username}) found ${users.length} users -> ${user && user.username} `);
  if (!user) {
    throw new Error(`Unable to find GitLab user with username: ${username}`);
  }

  return user;
});

module.exports = GitLabUserService;
