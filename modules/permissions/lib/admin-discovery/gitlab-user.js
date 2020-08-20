'use strict';

const identityService = require('gitter-web-identity');

/*
 * Returns descriptor for the users potential own community based on their personal user namespace
 */
async function getGitlabUserAdminDescriptor(user) {
  const gitlabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (!gitlabIdentity) {
    return;
  }

  return {
    type: 'GL_USER',
    externalId: gitlabIdentity.providerKey
  };
}

module.exports = {
  getGitlabUserAdminDescriptor
};
