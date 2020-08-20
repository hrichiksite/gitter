'use strict';

const asyncHandler = require('express-async-handler');
const identityService = require('gitter-web-identity');
const StatusError = require('statuserror');

function ensureUserIdentityByProvider(provider) {
  return asyncHandler(async function(req, res, next) {
    const identity = await identityService.getIdentityForUser(req.user, provider);

    if (!identity) {
      return next(new StatusError(403, `Only ${provider} users can use this endpoint`));
    }

    return next();
  });
}

module.exports = ensureUserIdentityByProvider;
