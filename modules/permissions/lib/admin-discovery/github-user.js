'use strict';

const identityService = require('gitter-web-identity');

/*
 * Returns descriptor for the users potential own community based on their personal user namespace
 */
async function getGithubUserAdminDescriptor(user) {
  const githubIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITHUB_IDENTITY_PROVIDER
  );
  if (!githubIdentity) {
    return;
  }

  return {
    type: 'GH_USER',
    externalId: githubIdentity.providerKey
  };
}

module.exports = {
  getGithubUserAdminDescriptor
};
