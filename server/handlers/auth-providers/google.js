'use strict';

var env = require('gitter-web-env');
var identifyRoute = env.middlewares.identifyRoute;

var passport = require('passport');
var trackLoginForProvider = require('../../web/middlewares/track-login-for-provider');
var rememberMe = require('../../web/middlewares/rememberme-middleware');
var ensureLoggedIn = require('../../web/middlewares/ensure-logged-in');
var redirectAfterLogin = require('../../web/middlewares/redirect-after-login');
var passportCallbackForStrategy = require('../../web/middlewares/passport-callback-for-strategy');

var routes = {};

routes.login = [
  identifyRoute('login-google'),
  trackLoginForProvider('google'),
  passport.authorize('google', {
    scope: ['profile', 'email'],
    failWithError: true
  })
];

routes.callback = [
  identifyRoute('login-callback'),
  passportCallbackForStrategy('google', { failWithError: true }),
  ensureLoggedIn,
  rememberMe.generateRememberMeTokenMiddleware,
  redirectAfterLogin
];

module.exports = routes;
