'use strict';

const identityService = require('gitter-web-identity');
const { GitLabProjectService } = require('gitter-web-gitlab');

// https://docs.gitlab.com/ee/api/access_requests.html
const MAINTAINER_ACCESS_LEVEL = 40;

async function getAdminProjectsForUser(user) {
  const gitlabProjectService = new GitLabProjectService(user);
  const projects = await gitlabProjectService.getProjects({
    perPage: 100,
    min_access_level: MAINTAINER_ACCESS_LEVEL
  });

  return projects;
}

/*
 * Finds URIs and external IDs for all GitLab projects that the user is a maintainer of
 */
async function getGitLabProjectAdminDescriptor(user) {
  const gitLabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (!gitLabIdentity) {
    return;
  }

  const projects = await getAdminProjectsForUser(user);

  const linkPaths = projects.map(project => project.uri);
  const externalIds = projects.map(project => project.id);

  return {
    type: 'GL_PROJECT',
    linkPath: linkPaths,
    externalId: externalIds.length ? externalIds : null
  };
}

module.exports = {
  getAdminProjectsForUser,
  getGitLabProjectAdminDescriptor
};
