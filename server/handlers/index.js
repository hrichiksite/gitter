'use strict';

var env = require('gitter-web-env');
var express = require('express');
var urlJoin = require('url-join');
const identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
const featureToggles = require('../web/middlewares/feature-toggles');
var preventClickjackingMiddleware = require('../web/middlewares/prevent-clickjacking');
const exploreRenderer = require('./renderers/explore-renderer');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use('/', /* clickjacking is fine-tuned in the file */ require('./root'));
router.use('/logout', preventClickjackingMiddleware, require('./logout'));
router.use('/login', preventClickjackingMiddleware, require('./login'));

router.get(
  new RegExp('^/explore(.*)?'),
  identifyRoute('root-explore'),
  preventClickjackingMiddleware,
  featureToggles,
  function(req, res) {
    // If logged in and trying to go to `/explore`, redirect to `/home/explore`
    if (req.user) {
      var userHomeExploreUrl = urlJoin('/home/explore', req.url.replace(/explore\/?/, ''));
      res.redirect(userHomeExploreUrl);
    } else {
      exploreRenderer.renderExplorePage(req, res);
    }
  }
);

router.use('/home', /* clickjacking is fine-tuned in the file */ require('./home'));
router.use('/settings', /* clickjacking is fine-tuned in the file */ require('./settings'));
router.use('/orgs', /* clickjacking is fine-tuned in the file */ require('./org-pages'));

// Serve the service-worker code from the root
// `GET /sw.js`
require('gitter-web-service-worker/server/sw-static').install(router);

router.use('/', /* clickjacking is fine-tuned in the file */ require('./app'));

/* Catch all - return 404 error */
router.get('/*', function(req, res, next) {
  return next(404);
});

// Error Handlers
router.use(env.middlewares.errorReporter);
router.use(require('../web/middlewares/token-error-handler'));
router.use(require('../web/middlewares/express-error-handler'));

module.exports = router;
