'use strict';

const isGitHubUser = require('gitter-web-identity/lib/is-github-user');
const PolicyEvaluatorBase = require('./policy-evaluator-base');

function userUsernameMatchesUri(user, uri) {
  if (!user || !user.username || !uri) return false;
  return user.username.toLowerCase() === uri.toLowerCase();
}

class GitHubRepoPolicyEvaluator extends PolicyEvaluatorBase {
  async _canAccess() {
    return isGitHubUser(this.user) && userUsernameMatchesUri(this.user, this.uri);
  }
}

module.exports = GitHubRepoPolicyEvaluator;
