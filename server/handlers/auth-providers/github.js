'use strict';

var env = require('gitter-web-env');
var identifyRoute = env.middlewares.identifyRoute;
var config = env.config;

const ensureUserIdentityByProvider = require('../../web/middlewares/ensure-user-identity-from-provider');
var passport = require('passport');
const identityService = require('gitter-web-identity');
var trackLoginForProvider = require('../../web/middlewares/track-login-for-provider');
var rememberMe = require('../../web/middlewares/rememberme-middleware');
var ensureLoggedIn = require('../../web/middlewares/ensure-logged-in');
var redirectAfterLogin = require('../../web/middlewares/redirect-after-login');
var passportCallbackForStrategy = require('../../web/middlewares/passport-callback-for-strategy');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var fonts = require('../../web/fonts');

var routes = {};

const SCOPE_ALLOWLIST = {
  'user:email': true,
  'read:org': true,
  repo: true
};

function getScopesFromReq(req) {
  const inputScopes = req.query.scopes ? req.query.scopes.split(/\s*,\s*/) : [''];
  const newScopes = inputScopes.filter(scope => SCOPE_ALLOWLIST[scope]);
  newScopes.push('user:email');
  newScopes.push('read:org');

  return newScopes;
}

routes.login = [
  identifyRoute('login-github'),
  trackLoginForProvider('github'),
  passport.authorize('github_user', {
    scope: 'user:email,read:org',
    failWithError: true
  })
];

routes.invited = [
  identifyRoute('login-invited'),
  function(req, res) {
    var query = req.query;

    // checks if we have a relative url path and adds it to the session
    if (query.uri) req.session.returnTo = config.get('web:basepath') + '/' + query.uri;

    res.render('login_invited', {
      username: query.welcome,
      uri: query.uri,
      bootScriptName: 'router-login',
      cssFileName: 'styles/login.css',
      // TODO: remove this and just show it anyway
      showNewLogin: true
    });
  }
];

routes.upgradeLandingPage = [
  ensureLoggedIn,
  identifyRoute('login-upgrade-landing-page'),
  // Once we allow multiple identities for a single user, we should get rid of this #multiple-identity-user
  ensureUserIdentityByProvider(identityService.GITHUB_IDENTITY_PROVIDER),
  function(req, res) {
    const newScopes = getScopesFromReq(req);

    res.render('login-upgrade-landing', {
      accessToken: req.accessToken,
      user: req.user,
      newScopes,
      fonts: fonts.getFonts(),
      hasCachedFonts: fonts.hasCachedFonts(req.cookies)
    });
  }
];

routes.upgrade = [
  ensureLoggedIn,
  identifyRoute('login-upgrade'),
  // Once we allow multiple identities for a single user, we should get rid of this #multiple-identity-user
  ensureUserIdentityByProvider(identityService.GITHUB_IDENTITY_PROVIDER),
  function(req, res, next) {
    var scopes = getScopesFromReq(req);
    var existing = req.user.githubScopes || {};
    var addedScopes = false;

    scopes.forEach(function(scope) {
      if (!existing[scope]) addedScopes = true;
      existing[scope] = true;
    });

    if (!addedScopes) {
      res.render('github-upgrade-complete', {
        oAuthCompletePostMessage: JSON.stringify({
          type: 'oauth_upgrade_complete',
          scopes: userScopes.getScopesHash(req.user)
        })
      });
      return;
    }

    var requestedScopes = Object.keys(existing).filter(function(f) {
      return !!f;
    });
    req.session.githubScopeUpgrade = true;

    passport.authorize('github_upgrade', {
      scope: requestedScopes,
      failWithError: true
    })(req, res, next);
  }
];

routes.callback = [
  identifyRoute('login-callback'),
  function(req, res, next) {
    var upgrade = req.session && req.session.githubScopeUpgrade;
    var strategy;
    if (upgrade) {
      strategy = 'github_upgrade';
    } else {
      strategy = 'github_user';
    }
    passportCallbackForStrategy(strategy, { failWithError: true })(req, res, next);
  },
  ensureLoggedIn,
  rememberMe.generateRememberMeTokenMiddleware,
  redirectAfterLogin
];

module.exports = routes;
