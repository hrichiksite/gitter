'use strict';

var _ = require('lodash');
const urlJoin = require('url-join');

var gitHubEmailAddressService = require('./github-email-address-service');
var gitHubProfileService = require('./github-profile-service');
const { getAdminOrgsForUser } = require('gitter-web-permissions/lib/admin-discovery/github-org');

function GitHubBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitHubBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return gitHubEmailAddressService(this.user, preferStoredEmail);
};

GitHubBackend.prototype.findOrgs = function() {
  var user = this.user;

  return getAdminOrgsForUser(user).then(function(ghOrgs) {
    // TODO: change these to be in a standard internal format
    return ghOrgs.map(org => {
      return {
        ...org,
        backend: 'github',
        absoluteUri: urlJoin('https://github.com', org.login)
      };
    });
  });
};

GitHubBackend.prototype.getProfile = function() {
  // the minimum response
  var profile = { provider: 'github' };
  return gitHubProfileService(this.user).then(function(gitHubProfile) {
    _.extend(profile, gitHubProfile);
    return profile;
  });
};

module.exports = GitHubBackend;
