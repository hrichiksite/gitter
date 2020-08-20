'use strict';

const express = require('express');
const cors = require('cors');
const resourceRoute = require('../../web/resource-route-generator');

const userResource = require('./user-export-resource');

// API uses CORS
const corsOptions = {
  origin: true,
  methods: ['GET'],
  //maxAge: 600, // 10 minutes
  allowedHeaders: ['content-type', 'x-access-token', 'authorization', 'accept'],
  exposedHeaders: [
    // Rate limiting with dolph
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use(cors(corsOptions));

router.use('/user', resourceRoute('api-export-user', userResource));

module.exports = router;
