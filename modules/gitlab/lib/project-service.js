'use strict';

const debug = require('debug')('gitter:app:gitlab:project-service');
const { Projects, ProjectMembers } = require('gitlab');
const { secureWrapFunction } = require('gitter-web-cache-wrapper');
const getGitlabAccessTokenFromUser = require('./get-gitlab-access-token-from-user');
const getPublicTokenFromPool = require('./get-public-token-from-pool');

function cacheFunction(name, obj) {
  return secureWrapFunction(`GitLabProjectService:${name}`, obj, async GitLabProjectService => {
    const accessToken = await GitLabProjectService.getAccessTokenPromise;
    return accessToken;
  });
}

// API reference: https://docs.gitlab.com/ee/api/projects.html
function standardizeProjectResponse(project) {
  debug('standardizeProjectResponse', project);
  return {
    backend: 'gitlab',
    id: project.id,
    name: project.name,
    description: project.description,
    absoluteUri: project.web_url,
    uri: project.path_with_namespace,
    private: project.visibility !== 'public',
    avatar_url: project.avatar_url
  };
}

function GitLabProjectService(user) {
  this.user = user;
  this.getAccessTokenPromise = getGitlabAccessTokenFromUser(user);
}

GitLabProjectService.prototype._getGitlabOpts = async function() {
  const accessToken = await this.getAccessTokenPromise;
  return {
    oauthToken: accessToken,
    token: getPublicTokenFromPool()
  };
};

GitLabProjectService.prototype.getProjects = cacheFunction('getProjects', async function(params) {
  const resource = new Projects(await this._getGitlabOpts());
  const res = await resource.all(params);

  return (res || []).map(standardizeProjectResponse);
});

GitLabProjectService.prototype.getProject = cacheFunction('getProject', async function(id) {
  const resource = new Projects(await this._getGitlabOpts());
  const project = await resource.show(id);

  return standardizeProjectResponse(project);
});

GitLabProjectService.prototype._getProjectMember = async function(projectId, gitlabUserId) {
  const gitlabLibOpts = await this._getGitlabOpts();
  const projectMembers = new ProjectMembers(gitlabLibOpts);

  try {
    const projectMember = await projectMembers.show(projectId, gitlabUserId, {
      includeInherited: true
    });
    debug('isMember projectMember response =>', projectMember);
    return projectMember;
  } catch (err) {
    debug('isMember error =>', err);
    if (err && err.response && err.response.status === 404) {
      return false;
    }

    throw err;
  }
};

GitLabProjectService.prototype.getMembership = cacheFunction('getMembership', async function(
  projectId,
  gitlabUserId
) {
  const projectMember = await this._getProjectMember(projectId, gitlabUserId);
  let accessLevel = 0;
  if (projectMember) {
    accessLevel = projectMember.access_level;
  }

  // https://docs.gitlab.com/ee/api/access_requests.html
  return {
    accessLevel,
    isMember: [10, 20, 30, 40, 50].some(level => level === accessLevel),
    isMaintainer: [40, 50].some(level => level === accessLevel),
    isOwner: accessLevel === 50
  };
});

module.exports = GitLabProjectService;
