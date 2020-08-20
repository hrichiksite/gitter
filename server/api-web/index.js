'use strict';

var express = require('express');
var authMiddleware = require('../web/middlewares/ensure-logged-in-or-get');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
const ensureLoggedIn = require('../web/middlewares/ensure-logged-in');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/private/ping', authMiddleware, identifyRoute('ping'), require('./private/ping'));

// Borrow the health check routes from /api/
router.get(
  '/private/health_check',
  identifyRoute('api-web-health-check'),
  require('../api/private/health-check')
);

router.get(
  '/private/health_check/full',
  identifyRoute('api-web-health-check-full'),
  require('../api/private/health-check-full')
);

router.use('/features', require('./features'));

// This is in /api_web because we want sessions/cookies to be acceptable authentication
// so you can click a link within the app
router.use('/export', [ensureLoggedIn, require('./export')]);

module.exports = router;
