'use strict';

var express = require('express');
var authMiddleware = require('../../web/middlewares/auth-api');
const env = require('gitter-web-env');
const identifyRoute = env.middlewares.identifyRoute;
const logger = env.logger;
var skipTokenErrorHandler = require('../../web/middlewares/skip-token-error-handler');

var router = express.Router({ caseSensitive: true, mergeParams: true });

// No auth
router.get('/health_check', identifyRoute('api-private-health-check'), require('./health-check'));

// No auth
router.get(
  '/health_check/full',
  identifyRoute('api-private-health-check-full'),
  require('./health-check-full')
);

// No auth
if (
  process.env.ENABLE_FIXTURE_ENDPOINTS &&
  (process.env.NODE_ENV === 'dev' ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'test-docker')
) {
  logger.warn('Fixtures endpoint is enabled!');
  router.use('/fixtures', require('./fixtures'));
}

router.get(
  '/gh/repos/*',
  authMiddleware,
  identifyRoute('api-private-github-repo-mirror'),
  require('./github-mirror/repos-mirror')
);

router.get(
  '/gh/users/*',
  authMiddleware,
  identifyRoute('api-private-github-users-mirror'),
  require('./github-mirror/users-mirror')
);

router.get(
  '/gh/search/users',
  authMiddleware,
  identifyRoute('api-private-github-user-search-mirror'),
  require('./github-mirror/user-search-mirror')
);

// No auth for hooks yet
router.post('/hook/:hash', identifyRoute('api-private-hook'), require('./hooks'));

router.get(
  '/irc-token',
  authMiddleware,
  identifyRoute('api-private-irc-token'),
  require('./irc-token')
);

router.get(
  '/issue-mirror',
  authMiddleware,
  identifyRoute('api-private-issue-mirror'),
  require('./issue-mirror')
);

router.get(
  '/issue-state',
  authMiddleware,
  identifyRoute('api-private-issue-state'),
  require('./issue-state')
);

router.get(
  '/generate-signature',
  authMiddleware,
  identifyRoute('api-private-transloadit-signature'),
  require('./transloadit-signature')
);

// No auth
router.post(
  '/transloadit/:token',
  identifyRoute('api-private-transloadit-callback'),
  require('./transloadit')
);

router.get(
  '/chat-heatmap/:roomId',
  authMiddleware,
  identifyRoute('api-private-chat-heatmap'),
  require('./chat-heatmap')
);

router.get(
  '/orgs/:orgUri/members',
  authMiddleware,
  skipTokenErrorHandler,
  identifyRoute('api-private-org-members'),
  require('./org-members')
);

router.post(
  '/subscription/:userOrOrg',
  identifyRoute('api-private-subscription-create'),
  require('./subscription-created')
);

router.delete(
  '/subscription/:userOrOrg',
  identifyRoute('api-private-subscription-delete'),
  require('./subscription-deleted')
);

router.post('/statsc', identifyRoute('api-private-statsc'), require('./statsc'));

router.get('/sample-chats', identifyRoute('api-private-sample-chats'), require('./sample-chats'));

router.post(
  '/create-badge',
  authMiddleware,
  identifyRoute('api-private-create-badge'),
  require('./create-badge-pr')
);

// TODO: this should go...
router.get(
  '/user-avatar/:username',
  identifyRoute('api-private-user-avatar'),
  require('./user-avatar')
);

router.use('/avatars', require('./avatars'));

router.post(
  '/markdown-preview',
  authMiddleware,
  identifyRoute('api-private-markdown-preview'),
  require('./markdown-preview')
);

router.get(
  '/inviteUserSuggestions',
  authMiddleware,
  identifyRoute('api-private-invite-user-suggestions'),
  require('./invite-user-suggestions')
);

router.get(
  '/check-invite',
  authMiddleware,
  identifyRoute('api-private-check-invite'),
  require('./check-invite')
);

router.get(
  '/check-group-uri',
  authMiddleware,
  identifyRoute('api-private-check-group-uri'),
  require('./check-group-uri')
);

router.post('/fp', authMiddleware, identifyRoute('api-private-fp'), require('./fingerprint'));

router.get(
  /^\/resolve\/(.*)$/,
  authMiddleware,
  identifyRoute('api-private-resolve'),
  require('./resolve')
);

/* Web push registration endpoint */
router.post('/vapid', authMiddleware, identifyRoute('api-private-vapid'), require('./vapid'));

module.exports = router;
