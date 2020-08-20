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
  identifyRoute('login-linkedin'),
  trackLoginForProvider('linkedin'),
  passport.authorize('linkedin', {
    failWithError: true,
    state: Math.floor(Math.random() * 100000)
  })
];

routes.callback = [
  identifyRoute('login-callback'),
  passportCallbackForStrategy('linkedin', { failWithError: true }),
  ensureLoggedIn,
  rememberMe.generateRememberMeTokenMiddleware,
  redirectAfterLogin
];

module.exports = routes;
