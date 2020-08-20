'use strict';

var express = require('express');
var featureToggles = require('../../web/middlewares/feature-toggles');
var fflip = require('fflip');
var cors = require('cors');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var corsOptions = {
  origin: function(origin, callback) {
    var allowedOrigin =
      origin === 'http://next.gitter.im' ||
      origin === 'https://next.gitter.im' ||
      origin === 'https://gitter.im' ||
      origin === 'https://beta.gitter.im';

    callback(null, allowedOrigin);
  },
  methods: 'GET,POST',
  credentials: true,
  maxAge: 600,
  allowedHeaders: ['content-type', 'x-requested-with', 'accept'],
  exposedHeaders: [
    // Rate limiting with dolph
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

var router = express.Router({ caseSensitive: true, mergeParams: true });
router.use(cors(corsOptions));

router.get(
  '/:name/:action',
  identifyRoute('api-web-feature-toggle-get'),
  featureToggles,
  fflip.express_route
);

router.post(
  '/:name/:action',
  identifyRoute('api-web-feature-toggle-post'),
  featureToggles,
  fflip.express_route
);

router.get(
  '/',
  identifyRoute('api-web-feature-toggle-list'),
  featureToggles,
  require('./feature-list')
);

module.exports = router;
