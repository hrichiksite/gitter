'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var config = env.config;

var express = require('express');
var crypto = require('crypto');
var request = require('request');
var StatusError = require('statuserror');
var jwt = require('jwt-simple');
const asyncHandler = require('express-async-handler');

var userSettingsService = require('gitter-web-user-settings');
var cdn = require('gitter-web-cdn');
var services = require('@gitterhq/services');
var debug = require('debug')('gitter:app:settings-route');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var fonts = require('../web/fonts');
var acceptInviteService = require('../services/accept-invite-service');
var loginUtils = require('../web/login-utils');
var resolveRoomUri = require('../utils/resolve-room-uri');

var identifyRoute = env.middlewares.identifyRoute;
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var uriContextResolverMiddleware = require('./uri-context/uri-context-resolver-middleware');
var preventClickjackingMiddleware = require('../web/middlewares/prevent-clickjacking');
var preventClickjackingOnlyGitterEmbedMiddleware = require('../web/middlewares/prevent-clickjacking-only-gitter-embed');

var passphrase = config.get('email:unsubscribeNotificationsSecret');

var supportedServices = [
  { id: 'github', name: 'GitHub' },
  { id: 'bitbucket', name: 'BitBucket' },
  { id: 'trello', name: 'Trello' }
];

var openServices = Object.keys(services).map(function(id) {
  return {
    id: id,
    name: services[id].name
  };
});

var serviceIdNameMap = supportedServices.concat(openServices).reduce(function(map, service) {
  map[service.id] = service.name;
  return map;
}, {});

function getIntegrations(req, res, next) {
  debug('Get integrations for %s', req.troupe.url);

  var url = config.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks';
  request.get(
    {
      url: url,
      json: true
    },
    function(err, resp, hooks) {
      if (err || resp.statusCode !== 200 || !Array.isArray(hooks)) {
        logger.error('failed to fetch hooks for troupe', {
          exception: err,
          resp: resp,
          hooks: hooks
        });
        return next(new StatusError(500, 'Unable to perform request. Please try again later.'));
      }

      hooks.forEach(function(hook) {
        hook.serviceDisplayName = serviceIdNameMap[hook.service];
      });

      res.render('integrations', {
        hooks: hooks,
        troupe: req.troupe,
        accessToken: req.accessToken,
        cdnRoot: cdn(''),
        supportedServices: supportedServices,
        openServices: openServices,
        fonts: fonts.getFonts(),
        hasCachedFonts: fonts.hasCachedFonts(req.cookies)
      });
    }
  );
}

function deleteIntegration(req, res, next) {
  debug('Delete integration %s for %s', req.body.id, req.troupe.url);

  request.del(
    {
      url: config.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks/' + req.body.id,
      json: true
    },
    function(err, resp) {
      if (err || resp.statusCode !== 200) {
        logger.error('failed to delete hook for troupe', { exception: err, resp: resp });
        return next(new StatusError(500, 'Unable to perform request. Please try again later.'));
      }

      res.redirect('/settings/integrations/' + req.troupe.uri);
    }
  );
}

function createIntegration(req, res, next) {
  debug('Create integration for %s', req.body.service, req.troupe.url);

  request.post(
    {
      url: config.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks',
      json: {
        service: req.body.service,
        endpoint: 'gitter'
      }
    },

    function(err, resp, body) {
      if (err || resp.statusCode !== 200 || !body) {
        logger.error('failed to create hook for troupe', { exception: err, resp: resp });
        return next(new StatusError(500, 'Unable to perform request. Please try again later.'));
      }

      var encryptedUserToken;

      // Pass through the token if we have write access
      // TODO: deal with private repos too
      if (userScopes.hasGitHubScope(req.user, 'public_repo')) {
        encryptedUserToken = jwt.encode(
          userScopes.getGitHubToken(req.user, 'public_repo'),
          config.get('integrations:secret')
        );
      } else {
        encryptedUserToken = '';
      }

      res.redirect(
        body.configurationURL +
          '&rt=' +
          resp.body.token +
          '&ut=' +
          encryptedUserToken +
          '&returnTo=' +
          config.get('web:basepath') +
          req.originalUrl
      );
    }
  );
}

const adminAccessCheck = asyncHandler(async (req, res, next) => {
  const uriContext = req.uriContext;
  const policy = uriContext.policy;

  const access = await policy.canAdmin();
  if (!access) throw new StatusError(403);

  next();
});

var router = express.Router({ caseSensitive: true, mergeParams: true });

[
  '/integrations/:roomPart1',
  '/integrations/:roomPart1/:roomPart2',
  '/integrations/:roomPart1/:roomPart2/:roomPart3'
].forEach(function(uri) {
  router.use(uri, function(req, res, next) {
    // Shitty method override because the integrations page
    // doesn't use javascript and relies on forms aka, the web as of 1996.
    var _method = req.body && req.body._method ? '' + req.body._method : '';
    if (req.method === 'POST' && _method.toLowerCase() === 'delete') {
      req.method = 'DELETE';
    }
    next();
  });

  router.get(
    uri,
    ensureLoggedIn,
    preventClickjackingOnlyGitterEmbedMiddleware,
    identifyRoute('settings-room-get'),
    uriContextResolverMiddleware,
    adminAccessCheck,
    getIntegrations
  );

  router.delete(
    uri,
    ensureLoggedIn,
    preventClickjackingOnlyGitterEmbedMiddleware,
    identifyRoute('settings-room-delete'),
    uriContextResolverMiddleware,
    adminAccessCheck,
    deleteIntegration
  );

  router.post(
    uri,
    ensureLoggedIn,
    preventClickjackingOnlyGitterEmbedMiddleware,
    identifyRoute('settings-room-create'),
    uriContextResolverMiddleware,
    adminAccessCheck,
    createIntegration
  );
});

router.get(
  '/accept-invite/:secret',
  identifyRoute('settings-accept-invite'),
  ensureLoggedIn,
  preventClickjackingMiddleware,
  function(req, res, next) {
    var secret = req.params.secret;
    return acceptInviteService
      .acceptInvite(req.user, secret, { source: req.query.source })
      .then(function(room) {
        return resolveRoomUri(room, req.user._id);
      })
      .then(function(roomUri) {
        var encodedUri = encodeURI(roomUri);
        res.relativeRedirect(encodedUri);
      })
      .catch(StatusError, function(err) {
        if (err.status >= 500) throw err;

        if (req.session) {
          var events = req.session.events;
          if (!events) {
            events = [];
            req.session.events = events;
          }
          events.push('invite_failed');
        }
        // TODO: tell the user why they could not get invited

        logger.error('Unable to use invite', {
          username: req.user && req.user.username,
          exception: err
        });
        return loginUtils.whereToNext(req.user).then(function(next) {
          res.relativeRedirect(next);
        });
      })
      .catch(next);
  }
);

router.get(
  '/unsubscribe/:hash',
  identifyRoute('settings-unsubscribe'),
  preventClickjackingMiddleware,
  function(req, res, next) {
    var plaintext;
    try {
      var decipher = crypto.createDecipher('aes256', passphrase);
      plaintext = decipher.update(req.params.hash, 'hex', 'utf8') + decipher.final('utf8');
    } catch (err) {
      return next(new StatusError(400, 'Invalid hash'));
    }

    var parts = plaintext.split(',');
    var userId = parts[0];
    var notificationType = parts[1];

    debug('User %s opted-out from ', userId, notificationType);
    stats.event('unsubscribed_unread_notifications', { userId: userId });

    userSettingsService
      .setUserSettings(userId, 'unread_notifications_optout', 1)
      .then(function() {
        var msg = "Done. You won't receive notifications like that one in the future.";

        res.render('unsubscribe', { layout: 'generic-layout', title: 'Unsubscribe', msg: msg });
      })
      .catch(next);
  }
);

router.get(
  '/badger/opt-out',
  ensureLoggedIn,
  preventClickjackingMiddleware,
  identifyRoute('settings-badger-optout'),
  function(req, res, next) {
    var userId = req.user.id;

    logger.info('User ' + userId + ' opted-out from auto badgers');
    stats.event('optout_badger', { userId: userId });

    return userSettingsService
      .setUserSettings(userId, 'badger_optout', 1)
      .then(function() {
        var msg = "Done. We won't send you automatic pull-requests in future.";

        res.render('unsubscribe', {
          layout: 'generic-layout',
          title: 'Opt-out',
          msg: msg
        });
      })
      .catch(next);
  }
);

module.exports = router;
