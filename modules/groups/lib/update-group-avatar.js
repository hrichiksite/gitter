'use strict';

var env = require('gitter-web-env');
var config = env.config;
const debug = require('debug')('gitter:app:groups:updateGroupAvatar');
const assert = require('assert');
var GitHubUserService = require('gitter-web-github').GitHubUserService;
const {
  GitLabGroupService,
  GitLabProjectService,
  GitLabUserService
} = require('gitter-web-gitlab');
var extractGravatarVersion = require('gitter-web-avatars/server/extract-gravatar-version');
var Group = require('gitter-web-persistence').Group;
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const getGithubUsernameFromGroup = require('./get-github-username-from-group');
const isGitlabSecurityDescriptorType = require('gitter-web-shared/is-gitlab-security-descriptor-type');

var LOCK_TIMEOUT_SECONDS = 10;

var redisClient = env.ioredis.createClient(config.get('redis_nopersist'), {
  keyPrefix: 'avatar-check:'
});

/**
 * Returns true if the avatar was updated
 */
async function updateGitterGroupAvatarForGithub(group, githubUsername) {
  const groupId = group._id;
  const sanitizedGroupId = mongoUtils.asObjectID(groupId);

  const result = await redisClient.set(
    'group:' + sanitizedGroupId,
    '1',
    'EX',
    LOCK_TIMEOUT_SECONDS,
    'NX'
  );

  let githubUser = false;
  if (result === 'OK') {
    const githubUserService = new GitHubUserService();
    githubUser = await githubUserService.getUser(githubUsername);
  }

  debug(
    `Attempting GitHub avatar update for group=${sanitizedGroupId} githubUsername=${githubUsername} githubUser=${JSON.stringify(
      githubUser
    )}`
  );

  if (!githubUser) {
    return false;
  }

  const avatarVersion = extractGravatarVersion(githubUser.avatar_url);
  if (!avatarVersion) {
    return false;
  }

  return Group.update(
    {
      _id: sanitizedGroupId,
      $or: [
        {
          avatarVersion: { $lt: avatarVersion }
        },
        {
          avatarVersion: null
        }
      ]
    },
    {
      $set: {
        avatarCheckedDate: new Date(),
        avatarVersion: avatarVersion
      }
    }
  )
    .exec()
    .then(result => {
      return result.nModified >= 1;
    });
}

/**
 * Returns true if the avatar was updated
 */
async function updateGitterGroupAvatarForGitlab(group) {
  const groupId = group._id;
  const type = group.sd && group.sd.type;
  const externalId = group.sd && group.sd.externalId;
  const sanitizedGroupId = mongoUtils.asObjectID(groupId);

  assert(isGitlabSecurityDescriptorType(type));

  const result = await redisClient.set(
    'group:' + sanitizedGroupId,
    '1',
    'EX',
    LOCK_TIMEOUT_SECONDS,
    'NX'
  );

  let gitlabObject;
  if (result === 'OK') {
    if (type === 'GL_GROUP') {
      // TODO: How do we handle private groups since we aren't passing in a user with GitLab access tokens who has access?
      const gitlabGroupService = new GitLabGroupService(/* user */);
      gitlabObject = await gitlabGroupService.getGroup(externalId);
    } else if (type === 'GL_PROJECT') {
      const gitlabProjectService = new GitLabProjectService(/* user */);
      gitlabObject = await gitlabProjectService.getProject(externalId);
    } else if (type === 'GL_USER') {
      const gitlabUserService = new GitLabUserService(/* user */);
      gitlabObject = await gitlabUserService.getUserById(externalId);
    } else {
      return false;
    }
  }

  debug(
    `Attempting GitLab avatar update for group=${sanitizedGroupId} ${type}=${JSON.stringify(
      gitlabObject
    )}`
  );

  if (!gitlabObject) {
    return false;
  }

  return Group.update(
    {
      _id: sanitizedGroupId
    },
    {
      $set: {
        // As a note `gitlabGroup.avatar_url` can be `null` if an avatar has not been set yet
        avatarUrl: gitlabObject.avatar_url,
        // `avatarVersion` needs to be `1` in order for the
        // `!group.avatarVersion` logic to work in `group-avatars.js`.
        // If it's `0`, it always updates avatar.
        avatarVersion: 1,
        avatarCheckedDate: new Date()
      }
    }
  )
    .exec()
    .then(result => {
      return result.nModified >= 1;
    });
}

async function updateGroupAvatar(group) {
  const githubUsername = getGithubUsernameFromGroup(group);
  if (githubUsername) {
    return updateGitterGroupAvatarForGithub(group, githubUsername);
  } else if (isGitlabSecurityDescriptorType(group.sd && group.sd.type)) {
    return updateGitterGroupAvatarForGitlab(group);
  }
}

module.exports = updateGroupAvatar;
