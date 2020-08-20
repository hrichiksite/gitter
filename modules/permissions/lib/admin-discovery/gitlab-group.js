'use strict';

const identityService = require('gitter-web-identity');
const { GitLabGroupService } = require('gitter-web-gitlab');

// https://docs.gitlab.com/ee/api/access_requests.html
const MAINTAINER_ACCESS_LEVEL = 40;

async function getAdminGroupsForUser(user) {
  const gitlabGroupService = new GitLabGroupService(user);
  const groups = await gitlabGroupService.getGroups({ min_access_level: MAINTAINER_ACCESS_LEVEL });

  return groups;
}

/*
 * Finds URIs and external IDs for all GitLab groups that the user is a maintainer of
 */
async function getGitLabGroupAdminDescriptor(user) {
  const gitLabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (!gitLabIdentity) {
    return;
  }

  const groups = await getAdminGroupsForUser(user);

  const linkPaths = groups.map(group => group.uri);
  const externalIds = groups.map(group => group.id);

  return {
    type: 'GL_GROUP',
    linkPath: linkPaths,
    externalId: externalIds.length ? externalIds : null
  };
}

module.exports = {
  getAdminGroupsForUser,
  getGitLabGroupAdminDescriptor
};
