'use strict';

var isGitHubUsername = require('./is-github-username');

var LEGACY_DEFAULT_SCOPE = { user: 1, 'user:email': 1, 'user:follow': 1, repo: 1, public_repo: 1 };

// eslint-disable-next-line complexity
function hasGitHubScope(user, scope) {
  var githubToken = user.githubToken;
  var githubScopes = user.githubScopes;
  var githubUserToken = user.githubUserToken;

  if (!githubUserToken && !githubToken) {
    return false;
  }

  // Get the simple case out the way
  if (githubUserToken && (scope === 'user' || scope === 'user:email' || scope === 'user:follow')) {
    return true;
  }

  function hasScope() {
    for (var i = 0; i < arguments.length; i++) {
      if (githubScopes[arguments[i]]) return true;
    }
    return false;
  }

  if (!githubScopes) {
    if (githubToken) {
      return !!LEGACY_DEFAULT_SCOPE[scope];
    }
    // Legacy users will need to reauthenticate unfortunately
    return false;
  }

  // Crazy github rules codified here....
  switch (scope) {
    case 'notifications':
      return hasScope('notifications', 'repo');
    case 'user:follow':
      return hasScope('user:follow', 'user');
    case 'user:email':
      return hasScope('user:email', 'user');
    case 'public_repo':
      return hasScope('public_repo', 'repo');
    case 'repo:status':
      return hasScope('repo:status', 'repo');
  }

  // The less crazy case
  return !!githubScopes[scope];
}

function getGitHubToken(user, scope) {
  if (!scope) return user.githubToken || user.githubUserToken;

  switch (scope) {
    case 'user':
    case 'user:email':
    case 'user:follow':
      return user.githubUserToken || user.githubToken;
  }

  return user.githubToken || user.githubUserToken;
}

function isGitHubUser(user) {
  // TODO: replace this with something more "provider-aware" (#github-uri-split)
  return isGitHubUsername(user.username);
}

function isMissingTokens(user) {
  // TODO: replace this with something more "provider-aware"
  // non-github users cannot miss their github tokens
  if (!isGitHubUser(user)) return false;
  return !user.githubToken && !user.githubUserToken;
}

/**
 * Deprecated
 */
function getScopesHash(user) {
  return {
    public_repo: hasGitHubScope(user, 'public_repo'),
    private_repo: hasGitHubScope(user, 'repo')
  };
}

module.exports = {
  hasGitHubScope: hasGitHubScope,
  getGitHubToken: getGitHubToken,
  isGitHubUser: isGitHubUser,
  isMissingTokens: isMissingTokens,
  getScopesHash: getScopesHash
};
