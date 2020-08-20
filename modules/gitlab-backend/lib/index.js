'use strict';

const {
  getAdminGroupsForUser
} = require('gitter-web-permissions/lib/admin-discovery/gitlab-group');

function GitLabBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitLabBackend.prototype.getEmailAddress = function(/*preferStoredEmail*/) {
  return this.identity.email;
};

GitLabBackend.prototype.findOrgs = function() {
  return getAdminGroupsForUser(this.user);
};

GitLabBackend.prototype.getProfile = function() {
  return { provider: 'gitlab' };
};

module.exports = GitLabBackend;
