'use strict';

var express = require('express');
var cors = require('cors');
var env = require('gitter-web-env');
var identifyRoute = env.middlewares.identifyRoute;

// API uses CORS
var corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  maxAge: 600, // 10 minutes
  allowedHeaders: ['content-type', 'x-access-token', 'authorization', 'accept'],
  exposedHeaders: [
    // Rate limiting with dolph
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/', function(req, res) {
  res.redirect('https://developer.gitter.im');
});

router.use(cors(corsOptions));
router.options('*', cors(corsOptions));

router.use(require('../web/middlewares/disallow-transfer-encoding-chunked'));

router.use('/v1', require('./v1'));
router.use('/private', require('./private'));

/** These two routes may seem a bit bizare, but we need to mount
 * /api/private/health_check on the api.gitter.com/api/private/.. even though
 * everything else is mounted on the root
 */
router.get(
  '/api/private/health_check',
  identifyRoute('api-private-health-check'),
  require('./private/health-check')
);

router.get(
  '/api/private/health_check/full',
  identifyRoute('api-private-health-check-full'),
  require('./private/health-check-full')
);

/* Catch all - return 404 error */
if (!process.env.DISABLE_API_404_HANDLER) {
  router.get('/*', function(req, res, next) {
    return next(404);
  });
}

// Error Handlers
router.use('/', require('../web/middlewares/token-error-handler'));
if (!process.env.DISABLE_API_ERROR_HANDLER) {
  router.use('/', env.middlewares.errorHandler);
}

module.exports = router;
