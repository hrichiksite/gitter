'use strict';

var Promise = require('bluebird');
var GitHubRepoCollaboratorService = require('./github-repo-collaborator-service');
var GitHubOrgCollaboratorService = require('./github-org-collaborator-service');
var GitHubUserCollaboratorService = require('./github-user-collaborator-service');
var TwitterUserCollaboratorService = require('./twitter-user-collaborator-service');
var identityService = require('gitter-web-identity');

function backedTypeFactory(user, type, linkPath) {
  switch (type) {
    case 'GH_REPO':
      return new GitHubRepoCollaboratorService(user, linkPath);

    case 'GH_ORG':
      return new GitHubOrgCollaboratorService(user, linkPath);
  }
}

function userCollaboratorFactory(user) {
  return identityService.findPrimaryIdentityForUser(user).then(function(identity) {
    if (!identity) return null;

    switch (identity.provider) {
      case identityService.GITHUB_IDENTITY_PROVIDER:
        return new GitHubUserCollaboratorService(user);

      case identityService.TWITTER_IDENTITY_PROVIDER:
        return new TwitterUserCollaboratorService(user, identity);

      default:
        // Possibly warn....
        return null;
    }
  });
}

function findCollaborators(user, type, linkPath) {
  // TODO: the current implementation only looks at backend
  // services to suggest collaborators, but
  // we should also been looking at Gitter for more
  // suggestions

  return Promise.try(function() {
    var roomBackendCollaboratorsService = backedTypeFactory(user, type, linkPath);
    if (!roomBackendCollaboratorsService) return null;

    return roomBackendCollaboratorsService.findCollaborators();
  }).then(function(collaborators) {
    if (collaborators && collaborators.length) return collaborators;

    return userCollaboratorFactory(user).then(function(collaboratorsService) {
      if (!collaboratorsService) return [];

      return collaboratorsService.findCollaborators();
    });
  });
}

module.exports = {
  findCollaborators: Promise.method(findCollaborators)
};
