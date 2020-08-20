'use strict';

var Promise = require('bluebird');
var identityService = require('gitter-web-identity');

module.exports = function(user) {
  if (!user) return Promise.resolve();

  return identityService
    .getIdentityForUser(user, identityService.GITLAB_IDENTITY_PROVIDER)
    .then(function(glIdentity) {
      if (!glIdentity) return null;

      return glIdentity.accessToken;
    });
};
