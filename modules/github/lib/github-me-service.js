'use strict';

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').user;

function GitHubMeService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

GitHubMeService.prototype.getUser = function() {
  return tentacles.user.getAuthUser({ accessToken: this.accessToken });
};

GitHubMeService.prototype.getEmail = function() {
  return tentacles.userEmail
    .listForAuthUser({
      accessToken: this.accessToken,
      headers: { Accept: 'application/json' } // Override the default. Remove once default is back to original
    })
    .then(function(emailHashes) {
      var primaries = emailHashes
        .filter(function(hash) {
          return hash.primary;
        })
        .map(function(hash) {
          return hash.email;
        });

      return primaries[0];
    });
};

// TODO: evaluate with upcoming changes
GitHubMeService.prototype.getOrgs = function() {
  return tentacles.org.listForAuthUser({
    accessToken: this.accessToken
  });
};

GitHubMeService.prototype.getOrgMembership = function(org) {
  return tentacles.orgMember.getMembershipForAuthUser(org, {
    accessToken: this.accessToken
  });
};

GitHubMeService.prototype.isOrgAdmin = function(org) {
  return this.getOrgMembership(org)
    .then(function(membership) {
      if (!membership) return false;
      if (membership.state !== 'active') return false;
      return membership.role === 'admin';
    })
    .catch(function(err) {
      if (err.statusCode === 404) return false;
      throw err;
    });
};

GitHubMeService.prototype.isOrgMember = function(org) {
  return this.getOrgMembership(org)
    .then(function(membership) {
      if (!membership) return false;
      if (membership.state !== 'active') return false;
      return true;
    })
    .catch(function(err) {
      if (err.statusCode === 404) return false;
      throw err;
    });
};

/* TODO: this will be affected by scope issues? */
GitHubMeService.prototype.getRepos = function() {
  return tentacles.repo.listForAuthUser({
    accessToken: this.accessToken
  });
};

GitHubMeService.prototype.getFollowers = function(options) {
  return tentacles.userFollower.listForUser(this.user.username, {
    accessToken: this.accessToken,
    firstPageOnly: options && options.firstPageOnly
  });
};

// module.exports = GitHubMeService;
module.exports = wrap(GitHubMeService, function() {
  return [this.accessToken || ''];
});
