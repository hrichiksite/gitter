'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var config = env.config;
var identifyRoute = env.middlewares.identifyRoute;

var jwt = require('jwt-simple');
var uuid = require('uuid/v4');
var url = require('url');
var express = require('express');
var GithubMeService = require('gitter-web-github').GitHubMeService;
var oauth2 = require('../web/oauth2');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-srcset');

var gitlab = require('./auth-providers/gitlab');
var github = require('./auth-providers/github');
var google = require('./auth-providers/google');
var twitter = require('./auth-providers/twitter');
var linkedin = require('./auth-providers/linkedin');
var validatedMessage = require('../web/validated-message');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/*', function(req, res, next) {
  // Fix for Windows Phone
  req.nonApiRoute = true;
  next();
});

router.get('/', identifyRoute('login'), function(req, res) {
  res.render('login', {
    source: req.query.source || 'login_page-login',
    returnTo: req.query.returnTo,
    bootScriptName: 'router-login',
    cssFileName: 'styles/login.css',
    // TODO: remove this and just show it anyway
    showNewLogin: true
  });
});

// ----------------------------------------------------------
// Common across different providers
// ----------------------------------------------------------

router.get('/upgrade-failed', identifyRoute('login-upgrade-failed'), function(req, res) {
  res.render('upgrade-failed');
});

router.get('/failed', identifyRoute('login-failed'), function(req, res) {
  var message = validatedMessage.validate(
    req.query.message,
    req.query.check,
    'An error occurred. Please try again'
  );

  res.render('login-failed', {
    message: message
  });
});

router.get('/token-revoked', identifyRoute('token-revoked'), function(req, res) {
  res.status(401);
  res.render('token-revoked', {
    appsLink: config.get('web:basepath') + '/apps'
  });
});

router.get('/user-agent-revoked', identifyRoute('user-agent-revoked'), function(req, res) {
  res.status(401);
  res.render('user-agent-revoked', {
    appsLink: config.get('web:basepath') + '/apps'
  });
});

// ----------------------------------------------------------
// GitHub
// ----------------------------------------------------------

router.get('/github', github.login);
router.get('/invited', github.invited);
router.get('/upgrade', github.upgradeLandingPage);
router.post('/upgrade', github.upgrade);

// alias the old /callback to the new /github/callback for backwards
// compatibility and so we can switch over without downtime
['/github/callback', '/callback'].forEach(function(path) {
  router.get(path, github.callback);
});

// ----------------------------------------------------------
// GitLab
// ----------------------------------------------------------

router.get('/gitlab', gitlab.login);
router.get('/gitlab/callback', gitlab.callback);

// ----------------------------------------------------------
// Google
// ----------------------------------------------------------

router.get('/google', google.login);
router.get('/google/callback', google.callback);

// ----------------------------------------------------------
// Twitter
// ----------------------------------------------------------

router.get('/twitter', twitter.login);
router.get('/twitter/callback', twitter.callback);

// ----------------------------------------------------------
// LinkedIn
// ----------------------------------------------------------

router.get('/linkedin', linkedin.login);
router.get('/linkedin/callback', linkedin.callback);

// ----------------------------------------------------------
// OAuth for our own clients
// ----------------------------------------------------------

// Our clients
router.get('/oauth/authorize', identifyRoute('login-oauth-authorize'), oauth2.authorization);

router.post('/oauth/authorize/decision', identifyRoute('login-oauth-decision'), oauth2.decision);

router.post('/oauth/token', identifyRoute('login-oauth-token'), oauth2.token);

router.all('/oauth/callback', identifyRoute('login-oauth-callback'), function(req, res) {
  res.send(
    'Wait time is the worst / I can hardly sit / No one has the time / Someone is always late'
  );
});

// Wait? Why is this here?
// REMOVE IT: app.post('/oauth/authorize/decision', oauth2.decision);

// Zendesk login callback
router.get('/zendesk', ensureLoggedIn, identifyRoute('login-zendesk'), function(req, res, next) {
  var ghMe = new GithubMeService(req.user);
  ghMe
    .getEmail()
    .then(function(email) {
      var cfg = config.get('zendesk');
      var payload = {
        iat: new Date().getTime() / 1000,
        jti: uuid(),
        name: req.user.displayName,
        email: email,
        external_id: req.user.id,
        remote_photo_url: resolveUserAvatarUrl(req.user, 128),
        user_fields: {
          username: req.user.username
        }
      };

      logger.info('Sending data to Zendesk', payload);

      var token = jwt.encode(payload, cfg.sharedKey);
      var redirect = 'https://' + cfg.subdomain + '.zendesk.com/access/jwt?jwt=' + token;

      var query = url.parse(req.url, true).query;

      if (query.return_to) {
        redirect += '&return_to=' + encodeURIComponent(query.return_to);
      }

      res.redirect(redirect);
    })
    .catch(next);
});

router.get('/embed', ensureLoggedIn, function(req, res) {
  res.render('embed-login-complete');
});

module.exports = router;
