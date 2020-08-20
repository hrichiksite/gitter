'use strict';

const GitHubRepoService = require('gitter-web-github').GitHubRepoService;
const PolicyDelegateTransportError = require('./policy-delegate-transport-error');
const debug = require('debug')('gitter:app:permissions:gh-repo-policy-delegate');
const isGitHubUser = require('gitter-web-identity/lib/is-github-user');
const PolicyDelegateBase = require('./policy-delegate-base');

class GhRepoPolicyDelegate extends PolicyDelegateBase {
  get securityDescriptorType() {
    return 'GH_REPO';
  }

  async hasPolicy(policyName) {
    debug('Checking policy %s', policyName);

    if (!this._isValidUser()) {
      return false;
    }

    const repoInfo = await this._checkRepoInfo();
    // Can't see the repo? no access
    if (!repoInfo) {
      debug('User is unable to see repository, denying access');
      return false;
    }

    switch (policyName) {
      case 'GH_REPO_ACCESS': {
        const result = !!repoInfo;
        debug('Access check returned %s', result);
        return result;
      }
      case 'GH_REPO_PUSH': {
        const perms = repoInfo.permissions;
        const result = perms && (perms.push || perms.admin);
        debug('Access check returned %s', result);
        return result;
      }

      default: {
        debug('Unknown permission, denying access');
        return false;
      }
    }
  }

  async _checkRepoInfo() {
    const user = await this._userLoader();

    if (!isGitHubUser(user)) return false;

    const uri = this._securityDescriptor.linkPath;
    debug('Fetching repo %s from github', uri);

    try {
      const repoService = new GitHubRepoService(user);
      return await repoService.getRepo(uri);
    } catch (err) {
      debug('Exeception while fetching repo');

      if ((err.errno && err.syscall) || err.statusCode >= 500) {
        // GitHub call failed and may be down.
        // We can fall back to whether the user is already in the room
        throw new PolicyDelegateTransportError(err.message);
      }

      throw err;
    }
  }
}

module.exports = GhRepoPolicyDelegate;
