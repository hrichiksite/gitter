'use strict';

var OrgService = require('gitter-web-github').GitHubOrgService;
var _ = require('lodash');
var avatars = require('gitter-web-avatars');
var identityService = require('gitter-web-identity');

function withoutCurrentUser(users, user) {
  if (!users || !users.length) return [];

  return users.filter(function(u) {
    return u.login !== user.username;
  });
}

function GitHubOrgCollaboratorService(user, orgName) {
  this.user = user;
  this.orgName = orgName;
}

GitHubOrgCollaboratorService.prototype.findCollaborators = function() {
  var ghOrg = new OrgService(this.user);

  return ghOrg
    .someMembers(this.orgName, { firstPageOnly: true })
    .bind(this)
    .then(function(orgMembers) {
      var candidates = withoutCurrentUser(orgMembers, this.user);

      return _.map(candidates, function(member) {
        return {
          displayName: member.login,
          externalId: member.login,
          avatarUrl: avatars.getForGitHubUsername(member.login),
          type: identityService.GITHUB_IDENTITY_PROVIDER
        };
      });
    });
};

module.exports = GitHubOrgCollaboratorService;
