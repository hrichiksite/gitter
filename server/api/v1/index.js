'use strict';

var express = require('express');
var resourceRoute = require('../../web/resource-route-generator');
var authMiddleware = require('../../web/middlewares/auth-api');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use('/user', authMiddleware);
router.use('/oauth-clients', authMiddleware);
router.use('/rooms', authMiddleware);
router.use('/users', authMiddleware);
router.use('/orgs', authMiddleware);
router.use('/groups', authMiddleware);

var userResources = resourceRoute('api-user', require('./user'));
const oauthClientsResources = resourceRoute('api-oauth-clients', require('./oauth-clients'));
var roomsResources = resourceRoute('api-rooms', require('./rooms'));
var usersResources = resourceRoute('api-rooms', require('./users'));
var orgResources = resourceRoute('api-orgs', require('./orgs'));
var groupsResources = resourceRoute('groups-orgs', require('./groups'));

router.use('/user', userResources);
router.use('/oauth-clients', oauthClientsResources);
router.use('/rooms', roomsResources);
router.use('/users', usersResources);
router.use('/orgs', orgResources);
router.use('/groups', groupsResources);

// APN has no auth requirement as user may not have authenticated
// and this is used for devices without users
router.post('/apn', identifyRoute('apn-registration'), require('./apn'));

// userapn ties together devices from /v1/apn and actual users.
// this definitely requires auth
router.post(
  '/userapn',
  authMiddleware,
  identifyRoute('user-apn-registration'),
  require('./userapn')
);

router.post('/eyeballs', authMiddleware, identifyRoute('eyeballs'), require('./eyeballs'));

router.delete('/sockets/:socketId', identifyRoute('remove-socket'), require('./sockets'));

router.get('/repo-info', authMiddleware, identifyRoute('repo-info'), require('./repo-info'));

router.post(
  '/private/gcm',
  authMiddleware,
  identifyRoute('gcm-registration'),
  require('./private/gcm')
);

module.exports = router;
