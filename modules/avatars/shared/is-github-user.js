'use strict';

/**
 * Nasty bridge
 * @deprecated
 */
function isGitHubUser(user) {
  if (!user || !user.username || (user.type && user.type !== 'github')) return false;
  if (user.username.indexOf('_') >= 0) return false;
  return true;
}

module.exports = isGitHubUser;
