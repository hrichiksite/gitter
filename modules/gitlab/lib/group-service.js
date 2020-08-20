'use strict';

const debug = require('debug')('gitter:app:gitlab:group-service');
const { Groups, GroupMembers } = require('gitlab');
const { secureWrapFunction } = require('gitter-web-cache-wrapper');
const getGitlabAccessTokenFromUser = require('./get-gitlab-access-token-from-user');
const getPublicTokenFromPool = require('./get-public-token-from-pool');

function cacheFunction(name, obj) {
  return secureWrapFunction(`GitLabGroupService:${name}`, obj, async gitLabGroupService => {
    const accessToken = await gitLabGroupService.getAccessTokenPromise;
    return accessToken;
  });
}

// API reference: https://docs.gitlab.com/ee/api/groups.html
function standardizeGroupResponse(group) {
  debug('standardizeGroupResponse', group);
  return {
    backend: 'gitlab',
    id: group.id,
    name: group.full_name,
    avatar_url: group.avatar_url,
    uri: group.full_path,
    absoluteUri: group.web_url
  };
}

function GitLabGroupService(user) {
  this.user = user;
  this.getAccessTokenPromise = getGitlabAccessTokenFromUser(user);
}

GitLabGroupService.prototype._getGitlabOpts = async function() {
  const accessToken = await this.getAccessTokenPromise;
  return {
    oauthToken: accessToken,
    token: getPublicTokenFromPool()
  };
};

GitLabGroupService.prototype.getGroups = cacheFunction('getGroups', async function(params) {
  const resource = new Groups(await this._getGitlabOpts());
  const res = await resource.all(params);

  return (res || []).map(standardizeGroupResponse);
});

GitLabGroupService.prototype.getGroup = cacheFunction('getGroup', async function(id) {
  const resource = new Groups(await this._getGitlabOpts());
  const group = await resource.show(id);

  return standardizeGroupResponse(group);
});

GitLabGroupService.prototype._getGroupMember = async function(groupId, gitlabUserId) {
  const gitlabLibOpts = await this._getGitlabOpts();
  const groupMembers = new GroupMembers(gitlabLibOpts);

  try {
    const groupMember = await groupMembers.show(groupId, gitlabUserId, {
      includeInherited: true
    });
    debug('isMember groupMember response =>', groupMember);
    return groupMember;
  } catch (err) {
    debug('isMember error =>', err);
    if (err && err.response && err.response.status === 404) {
      return false;
    }

    throw err;
  }
};

GitLabGroupService.prototype.getMembership = cacheFunction('getMembership', async function(
  groupId,
  gitlabUserId
) {
  const groupMember = await this._getGroupMember(groupId, gitlabUserId);
  let accessLevel = 0;
  if (groupMember) {
    accessLevel = groupMember.access_level;
  }

  // https://docs.gitlab.com/ee/api/access_requests.html
  return {
    accessLevel,
    isMember: [10, 20, 30, 40, 50].some(level => level === accessLevel),
    isMaintainer: [40, 50].some(level => level === accessLevel),
    isOwner: accessLevel === 50
  };
});

module.exports = GitLabGroupService;
