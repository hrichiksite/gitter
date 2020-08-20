'use strict';

const GitLabGroupService = require('./group-service');
const GitLabProjectService = require('./project-service');
const GitLabUserService = require('./user-service');
const debug = require('debug')('gitter:app:github:gitlab-uri-validator');

// If it's a network or permissions problem, throw the error
// We don't care about the errors when it does not find a user because it could
// be a group or project or vice versa
function throwNetworkErrors(err) {
  if (err.response && err.response.status && err.response.status !== 404) {
    throw err;
  }
}

/**
 * Given a uri, is it a valid GitLab group, user, or project
 * @returns promise of GROUP / USER / PROJECT or null
 */
async function validateGitlabUri(user, uri) {
  debug('validateUri: %s', uri);

  try {
    debug('validateUri -> user: %s', uri);
    const userService = new GitLabUserService(user);
    const gitlabUser = await userService.getUserByUsername(uri);

    return {
      type: 'USER',
      uri: gitlabUser.username,
      description: gitlabUser.name,
      externalId: parseInt(gitlabUser.id, 10) || undefined
    };
  } catch (err) {
    throwNetworkErrors(err);
  }

  try {
    debug('validateUri -> group: %s', uri);
    const groupService = new GitLabGroupService(user);
    const group = await groupService.getGroup(uri);

    return {
      type: 'GROUP',
      uri: group.uri,
      description: group.name,
      externalId: parseInt(group.id, 10) || undefined
    };
  } catch (err) {
    throwNetworkErrors(err);
  }

  try {
    debug('validateUri -> project: %s', uri);
    const projectService = new GitLabProjectService(user);
    const project = await projectService.getProject(uri);

    return {
      type: 'PROJECT',
      uri: project.uri,
      description: project.name,
      externalId: parseInt(project.id, 10) || undefined
    };
  } catch (err) {
    throwNetworkErrors(err);
  }

  return null;
}

module.exports = validateGitlabUri;
