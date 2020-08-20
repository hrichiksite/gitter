'use strict';

var isGitHubUser = require('../shared/is-github-user');
var avatarCdnResolver = require('../shared/avatar-cdn-resolver');
var extractTwitterAvatarInfo = require('../shared/extract-twitter-avatar-info');
var gravatar = require('./gravatar');

var clientEnv = require('gitter-client-env');
var avatarUrl = clientEnv.avatarsUrl;

var DEFAULT = avatarUrl + '/default';

function getForGitHubUsername(githubUsername) {
  return avatarCdnResolver('/gh/u/' + githubUsername);
}

function getForGravatarEmail(emailAddress) {
  var hash = gravatar.hashEmail(emailAddress);
  return avatarCdnResolver('/gravatar/m/' + hash);
}

function getForTwitterUrl(twitterUrl) {
  var info = extractTwitterAvatarInfo(twitterUrl);
  if (!info) return DEFAULT;
  return avatarCdnResolver('/tw/i/' + info.id + '/' + info.filename);
}

function getForGroupId(groupId) {
  if (!groupId) return DEFAULT;
  return avatarCdnResolver('/group/i/' + groupId);
}

function getForGroup(group) {
  if (!group) return DEFAULT;
  var groupId = group.id || group._id;
  if (!groupId) return DEFAULT;

  if (group.avatarVersion) {
    return avatarCdnResolver('/group/iv/' + group.avatarVersion + '/' + groupId);
  } else {
    return getForGroupId(groupId);
  }
}

/**
 * This will change in future
 */
function getForRoomUri(uri) {
  if (!uri) return DEFAULT;
  var orgOrUser = uri.split('/')[0];
  return avatarCdnResolver('/gh/u/' + orgOrUser);
}

/**
 * This will change in future
 */
function getForUser(user) {
  if (!user) return DEFAULT;
  var username = user.username;
  if (!username) return DEFAULT;

  if (!isGitHubUser(user)) {
    // In future, all users will be routed here
    // Get our services to resolve the user
    return avatarCdnResolver('/g/u/' + username);
  }

  var gv = user.gravatarVersion || user.gv;

  if (gv) {
    // Use the versioned interface
    return avatarCdnResolver('/gh/uv/' + gv + '/' + username);
  } else {
    // Use the unversioned interface, with a shorter cache time
    return avatarCdnResolver('/gh/u/' + username);
  }
}

function getDefault() {
  return DEFAULT;
}

module.exports = {
  getForGitHubUsername: getForGitHubUsername,
  getForGravatarEmail: getForGravatarEmail,
  getForTwitterUrl: getForTwitterUrl,
  getForGroupId: getForGroupId,
  getForGroup: getForGroup,
  getForRoomUri: getForRoomUri,
  getForUser: getForUser,
  getDefault: getDefault
};
