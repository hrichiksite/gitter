'use strict';

var env = require('gitter-web-env');
var errorReporter = env.errorReporter;
const logger = env.logger;
var Group = require('gitter-web-persistence').Group;
var url = require('url');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
var updateGroupAvatar = require('./update-group-avatar');
var debug = require('debug')('gitter:app:groups:group-avatars');
const getGithubUsernameFromGroup = require('./get-github-username-from-group');
const isGitterInternalAvatarUrl = require('./is-gitter-internal-group-avatar-url');
const isGitlabSecurityDescriptorType = require('gitter-web-shared/is-gitlab-security-descriptor-type');

/**
 * Check on avatars once a week. In future, we may bring this
 * down or come up with an alternative method of looking
 * this up.
 */
var AVATAR_VERSION_CHECK_TIMEOUT = 7 * 86400 * 1000;

var KNOWN_AVATAR_SIZES = [22, 40, 44, 48, 64, 80, 96, 128];

// Just in case
KNOWN_AVATAR_SIZES.sort((a, b) => {
  return a - b;
});

var SELECT_FIELDS = {
  _id: 1,
  avatarUrl: 1,
  avatarVersion: 1,
  avatarCheckedDate: 1,
  'sd.type': 1,
  'sd.linkPath': 1,
  'sd.externalId': 1
};

/** Return the best size for the requested avatar size */
function getBestSizeFor(size) {
  for (var i = 0; i < KNOWN_AVATAR_SIZES.length; i++) {
    var currentSize = KNOWN_AVATAR_SIZES[i];
    if (size <= currentSize) return currentSize;
  }

  return null;
}

/**
 * Returns the optimal avatar url to return for the given size
 */
function getGroupAvatarUrlForSize(group, size) {
  const avatarUrl = group.avatarUrl;

  const parsed = url.parse(avatarUrl, true);

  // Tack on a version param otherwise the S3 url is always the same and
  // you always get the cached avatar from nginx's cache.
  parsed.query = parsed.query || {};
  if (group.avatarVersion) {
    parsed.query.v = group.avatarVersion;
  }

  if (isGitterInternalAvatarUrl(avatarUrl)) {
    const bestSize = getBestSizeFor(size);

    // Just use the original
    if (!bestSize) return avatarUrl;

    var pathParts = parsed.pathname.split('/');
    pathParts.pop();
    pathParts.push(bestSize);
    parsed.pathname = pathParts.join('/');
    return url.format(parsed);
  } else if (isGitlabSecurityDescriptorType(group.sd && group.sd.type)) {
    if (size) {
      // This doesn't actually work but these parameters are added in the GitLab UI
      parsed.query.width = size;
    }

    return url.format(parsed);
  }
}

/**
 * Rely on the secondary, but if that doesn't find a recently
 * created group, fallback to querying the primary
 */
function findOnSecondaryOrPrimary(groupId) {
  return Group.findById(groupId, SELECT_FIELDS, { lean: true })
    .read(mongoReadPrefs.secondaryPreferred)
    .then(function(group) {
      if (group) return group;

      // Chance that it's not on the secondary yet...
      return Group.findById(groupId, SELECT_FIELDS, { lean: true }).exec();
    });
}

async function checkForAvatarUpdate(group) {
  const groupId = group._id;

  // No need to check GitLab/GitHub if we manage the URL ourselves
  if (group.avatarUrl && isGitterInternalAvatarUrl(group.avatarUrl)) {
    debug("Skipping avatar update for groupId=%s because it's an internal Gitter avatar", groupId);
    return;
  }

  if (
    !group.avatarVersion ||
    !group.avatarCheckedDate ||
    Date.now() - group.avatarCheckedDate > AVATAR_VERSION_CHECK_TIMEOUT
  ) {
    debug('Attempting to fetch group avatar for groupId=%s', groupId);

    return updateGroupAvatar(group).catch(function(err) {
      logger.error(err, err.response && `${err.response.status} ${err.response.url}`);
      errorReporter(
        err,
        {
          groupId: groupId
        },
        { module: 'group-avatar' }
      );
    });
  }
}

// Use the custom group avatar URL if we have one
function _getAvatarFromGroup(group, size) {
  if (group.avatarUrl) {
    return getGroupAvatarUrlForSize(group, size);
  }
}

function _getAvatarFromSecurityDescriptor(group, size) {
  // Use the Security Descriptor to
  // generate an avatar
  const linkPath = group.sd && group.sd.linkPath;

  if (!linkPath) return null;

  const githubUsername = getGithubUsernameFromGroup(group);
  let avatarUrl = 'https://avatars.githubusercontent.com/' + githubUsername + '?s=' + size;

  if (group.avatarVersion) {
    avatarUrl = avatarUrl + '&v=' + group.avatarVersion;

    return avatarUrl;
  } else {
    return avatarUrl;
  }
}

async function getAvatarUrlForGroupId(groupId, size) {
  const group = await findOnSecondaryOrPrimary(groupId);

  if (!group) return null;

  checkForAvatarUpdate(group);

  return _getAvatarFromGroup(group, size) || _getAvatarFromSecurityDescriptor(group, size);
}

module.exports = {
  getAvatarUrlForGroupId: getAvatarUrlForGroupId
};
