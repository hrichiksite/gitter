'use strict';

// TODO: improve this
function isGitHubUser(user) {
  return user.githubUserToken || user.githubToken || user.githubId;
}

module.exports = isGitHubUser;
