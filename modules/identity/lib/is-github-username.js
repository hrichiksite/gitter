'use strict';

/**
 * @deprecated
 * TODO: remove this (#github-uri-split)
 */
function isGitHubUsername(username) {
  return username && username.indexOf('_') < 0;
}

module.exports = isGitHubUsername;
