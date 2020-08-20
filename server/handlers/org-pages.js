'use strict';

var express = require('express');
var isPhoneMiddleware = require('../web/middlewares/is-phone');
var groupContextResolverMiddleware = require('./uri-context/group-context-resolver-middleware');
var featureToggles = require('../web/middlewares/feature-toggles');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var redirectErrorMiddleware = require('./uri-context/redirect-error-middleware');
var preventClickjackingMiddleware = require('../web/middlewares/prevent-clickjacking');
var preventClickjackingOnlyGitterEmbedMiddleware = require('../web/middlewares/prevent-clickjacking-only-gitter-embed');
var router = express.Router({ caseSensitive: true, mergeParams: true });

/**
 * These routes are deprecated. Use `group.homeUri` instead.
 */
router.get(
  '/:groupUri/rooms',
  identifyRoute('group-rooms-mainframe'),
  preventClickjackingMiddleware,
  featureToggles,
  isPhoneMiddleware,
  groupContextResolverMiddleware,
  function(req, res, next) {
    var uriContext = req.uriContext;
    var group = uriContext && uriContext.group;
    var homeUri = group && group.homeUri;

    if (homeUri) {
      res.relativeRedirect('/' + homeUri);
    } else {
      return next('route');
    }
  },
  redirectErrorMiddleware
);

router.get(
  '/:groupUri/rooms/~iframe',
  identifyRoute('group-rooms-frame'),
  preventClickjackingOnlyGitterEmbedMiddleware,
  featureToggles,
  isPhoneMiddleware,
  groupContextResolverMiddleware,
  function(req, res, next) {
    var uriContext = req.uriContext;
    var group = uriContext && uriContext.group;
    var homeUri = group && group.homeUri;

    if (homeUri) {
      res.relativeRedirect('/' + homeUri + '/~iframe');
    } else {
      return next('route');
    }
  },
  redirectErrorMiddleware
);

module.exports = router;
