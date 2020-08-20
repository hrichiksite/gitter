'use strict';

var Promise = require('bluebird');
var env = require('gitter-web-env');
var nconf = env.config;
var logger = env.logger;
var errorReporter = env.errorReporter;
var StatusError = require('statuserror');
var checkAlreadyOnUnauthorizedUrl = require('../utils/check-already-on-unauthorized-url');

const revokedUserAgents = [].concat(nconf.get('revokedUserAgents'));

function validateUserAgentFromReq(req) {
  let isUserAgentValid = true;
  try {
    // We would be safe without this check but this is just a pre-optimization to avoid going through the logic below
    if (!revokedUserAgents || revokedUserAgents.length === 0) return true;

    // If they are missing a user-agent then let them pass because we have nothing to filter on
    if (!req || !req.headers) return true;
    var useragentHeader = req.headers['user-agent'];
    if (!useragentHeader) return true;

    // We already redirected them to the only page they can visit
    var alreadyOnUnauthorizedUrl = checkAlreadyOnUnauthorizedUrl(req.url);
    if (alreadyOnUnauthorizedUrl) return true;

    isUserAgentValid = !revokedUserAgents.some(needle => {
      return useragentHeader.includes(needle);
    });
  } catch (err) {
    errorReporter(err, {}, { module: 'validate-user-agent-from-req' });

    // Just let them through if it's our fault
    return true;
  }

  if (!isUserAgentValid) {
    logger.warn('user-agent can not be accepted (matches revoked user-agent): ', {
      userAgent: useragentHeader
    });

    var err = new StatusError(401, 'user-agent is not allowed');
    err.revokedUserAgent = true;
    throw err;
  }
}

module.exports = Promise.method(validateUserAgentFromReq);
