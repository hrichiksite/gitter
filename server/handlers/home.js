'use strict';

var express = require('express');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var timezoneMiddleware = require('../web/middlewares/timezone');
var isPhoneMiddleware = require('../web/middlewares/is-phone');
var featureToggles = require('../web/middlewares/feature-toggles');
var userHomeRenderer = require('./renderers/userhome');
const exploreRenderer = require('./renderers/explore-renderer');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var preventClickjackingMiddleware = require('../web/middlewares/prevent-clickjacking');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get(
  '/',
  identifyRoute('home-main'),
  featureToggles,
  preventClickjackingMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function(req, res, next) {
    userHomeRenderer.renderHomePage(req, res, next);
  }
);

// Used for the create button on `/home`
router.get(
  '/createroom',
  identifyRoute('create-room-redirect'),
  ensureLoggedIn,
  preventClickjackingMiddleware,
  featureToggles,
  function(req, res) {
    res.redirect('/home#createroom');
  }
);

router.get(
  new RegExp('/explore(.*)?'),
  identifyRoute('home-explore'),
  preventClickjackingMiddleware,
  featureToggles,
  isPhoneMiddleware,
  function(req, res) {
    if (req.user) {
      return exploreRenderer.renderExplorePage(req, res);
    } else {
      return res.redirect('/explore');
    }
  }
);

// FIXME: Remove after 2020-8-22
router.get(
  '/learn',
  identifyRoute('home-learn-main'),
  ensureLoggedIn,
  preventClickjackingMiddleware,
  featureToggles,
  isPhoneMiddleware,
  function(req, res) {
    return res.redirect('/home');
  }
);

module.exports = router;
