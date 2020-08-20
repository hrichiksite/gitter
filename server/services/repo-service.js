'use strict';

var GithubRepo = require('gitter-web-github').GitHubRepoService;
const { GitLabProjectService } = require('gitter-web-gitlab');
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');
const identityService = require('gitter-web-identity');
const {
  getAdminProjectsForUser
} = require('gitter-web-permissions/lib/admin-discovery/gitlab-project');

// https://docs.gitlab.com/ee/api/access_requests.html
const GUEST_ACCESS_LEVEL = 10;

/**
 * Gets a list of GitHub repos for a user
 * @returns The promise of a list of repos for the user
 */
async function _getGitHubReposForUser(user) {
  const ghRepo = new GithubRepo(user);
  return ghRepo.getAllReposForAuthUser().map(repo => {
    repo.backend = 'github';
    return repo;
  });
}

/**
 * Gets a list of repos for a user
 * @returns The promise of a list of repos for the user
 */
async function getReposForUser(user) {
  if (isGitHubUser(user)) {
    return _getGitHubReposForUser(user);
  }

  const gitLabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (gitLabIdentity) {
    const gitlabProjectService = new GitLabProjectService(user);
    return gitlabProjectService.getProjects({
      perPage: 100,
      min_access_level: GUEST_ACCESS_LEVEL
    });
  }

  return [];
}

/**
 *
 * @returns The promise of a list of repos for the user
 */
async function getAdminReposForUser(user) {
  if (isGitHubUser(user)) {
    const repos = await _getGitHubReposForUser(user);

    return repos.filter(function(repo) {
      if (repo) return repo.permissions && (repo.permissions.push || repo.permissions.admin);
    });
  }

  const gitLabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (gitLabIdentity) {
    return getAdminProjectsForUser(user);
  }

  return [];
}

module.exports = {
  getReposForUser: getReposForUser,
  getAdminReposForUser: getAdminReposForUser
};
