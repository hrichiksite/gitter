'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var logger = env.logger;
var errorReporter = env.errorReporter;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix') });

var oauth = require('gitter-web-oauth');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var presenceService = require('gitter-web-presence');
var recentRoomService = require('gitter-web-rooms/lib/recent-room-service');
var contextGenerator = require('../context-generator');
var StatusError = require('statuserror');
var bayeuxExtension = require('./extension');
var clientUsageStats = require('../../utils/client-usage-stats');
var appVersion = require('gitter-app-version');
var useragent = require('useragent');
var debug = require('debug')('gitter:app:bayeux-authenticator');

function getConnectionType(incoming) {
  if (!incoming) return 'online';

  switch (incoming) {
    case 'online':
      return 'online';
    case 'mobile':
      return 'mobile';

    default:
      return 'online';
  }
}

function getUserAgentFamily(req) {
  if (!req || !req.headers) return;
  var useragentHeader = req.headers['user-agent'];
  if (!useragentHeader) return;
  var agent = useragent.lookup(useragentHeader);
  return agent && agent.family;
}

var version = appVersion.getVersion();

// Validate handshakes
module.exports = bayeuxExtension({
  channel: '/meta/handshake',
  name: 'authenticator',
  failureStat: 'bayeux.handshake.deny',
  skipSuperClient: true,
  skipOnError: true,
  privateState: true,
  incoming: function(message, req, callback) {
    var ext = message.ext || {};

    var token = ext.token;

    if (!token || typeof token !== 'string') {
      return callback(new StatusError(401, 'Access token required'));
    }

    var tags = [];
    if (ext.realtimeLibrary) {
      tags.push('library:' + ext.realtimeLibrary);
    }

    // Quick way of telling anonymous users apart
    var isAnonymous = token.charAt(0) === '$';
    if (isAnonymous) {
      tags.push('anonymous:1');
    } else {
      tags.push('anonymous:0');
    }

    var useragentFamily = getUserAgentFamily(req);
    if (useragentFamily) {
      tags.push('useragent:' + useragentFamily);
    }

    statsd.increment('bayeux.handshake.attempt', 1, 0.25, tags);

    oauth
      .validateAccessTokenAndClient(ext.token)
      .then(function(tokenInfo) {
        if (!tokenInfo) {
          return callback(new StatusError(401, 'Invalid access token'));
        }

        var user = tokenInfo.user;
        var oauthClient = tokenInfo.client;
        var userId = user && user.id;

        if (user && oauthClient) {
          clientUsageStats.record(user, oauthClient, req);
        }

        debug(
          'bayeux: handshake. appVersion=%s, username=%s, client=%s',
          ext.appVersion,
          user && user.username,
          oauthClient.name
        );

        var connectionType = getConnectionType(ext.connType);

        message._private.authenticator = {
          userId: userId,
          connectionType: connectionType,
          client: ext.client,
          troupeId: ext.troupeId,
          oauthClientId: oauthClient.id,
          token: ext.token,
          uniqueClientId: ext.uniqueClientId,
          realtimeLibrary: ext.realtimeLibrary,
          eyeballState: parseInt(ext.eyeballs, 10) || 0
        };

        return message;
      })
      .asCallback(callback);
  },

  outgoing: function(message, req, callback) {
    if (!message.ext) message.ext = {};
    message.ext.appVersion = version;

    var state = message._private && message._private.authenticator;
    if (!state) return callback(null, message);

    const { clientId } = message;
    const {
      userId,
      connectionType,
      client: clientType,
      troupeId,
      oauthClientId,
      token,
      uniqueClientId,
      realtimeLibrary,
      eyeballState
    } = state;

    // Get the presence service involved around about now
    presenceService.userSocketConnected(
      userId,
      clientId,
      connectionType,
      clientType,
      realtimeLibrary,
      troupeId,
      oauthClientId,
      token,
      uniqueClientId,
      eyeballState,
      function(err) {
        if (err) {
          logger.warn('bayeux: Unable to associate connection ' + clientId + ' to ' + userId, {
            troupeId: troupeId,
            client: clientType,
            exception: err
          });
          return callback(err);
        }

        debug(
          'Connection %s is associated to user %s (troupeId=%s, clientId=%s, oauthClientId=%s)',
          clientId,
          userId,
          troupeId,
          clientType,
          oauthClientId
        );

        message.ext.userId = userId;

        if (userId && troupeId && mongoUtils.isLikeObjectId(troupeId)) {
          // In chat-cache mode, this will give the room an incorrect last-access-time
          recentRoomService
            .saveLastVisitedTroupeforUserId(userId, troupeId, { skipFayeUpdate: true })
            .catch(function(err) {
              logger.error('Error while saving last visted room. Silently ignoring. ' + err, {
                exception: err
              });
              errorReporter(
                err,
                { troupeId: troupeId, userId: userId },
                { module: 'authenticator' }
              );
            });
        }

        // If the troupeId was included, it means we've got a native
        // client and they'll be looking for a snapshot:
        contextGenerator.generateSocketContext(userId, troupeId).nodeify(function(err, context) {
          if (err) return callback(err);

          message.ext.context = context;

          // Not possible to throw an error here, so just carry only
          callback(null, message);
        });
      }
    );
  }
});
