'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var url = require('url');
var debug = require('debug')('gitter:infra:login-required-middleware');

var validAuthProviders = {
  gitlab: true,
  github: true,
  google: true,
  linkedin: true,
  twitter: true
};

module.exports = function(req, res) {
  // Are we dealing with an API client? Tell em in HTTP
  // Windows Phone sends accept: */* for oauth logins. Reported by @RReverser
  if (!req.nonApiRoute && req.accepts(['json', 'html']) === 'json') {
    /* API client without access, shouldn't really happen :( */
    logger.warn('User is not logged in, denying access');

    return res.status(401).send({ success: false, loginRequired: true });
  }

  if (req.session) {
    req.session.returnTo = req.originalUrl;
  }

  var authProvider = getAuthProviderIfValid(req);
  if (authProvider) {
    var query = {};
    // tracking data from the original request needs to be passed on to the
    // login action
    if (req.query.action) query.action = req.query.action;
    if (req.query.source) query.source = req.query.source;

    debug('User is not logged in, redirecting to %s login page', authProvider);

    var redirect = url.format({ pathname: '/login/' + authProvider, query: query });
    return res.relativeRedirect(redirect);
  }

  debug('User is not logged in, redirecting to login page');
  // login page buttons provide their own tracking querystrings,
  // so none are needed here
  return res.relativeRedirect('/login');
};

function getAuthProviderIfValid(req) {
  var authProvider = req.query.auth_provider;

  if (!validAuthProviders[authProvider]) {
    debug('invalid auth provider "%s", skipping', authProvider);
    return;
  }

  return authProvider;
}
