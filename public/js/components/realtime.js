'use strict';

var Backbone = require('backbone');
var context = require('gitter-web-client-context');
var clientEnv = require('gitter-client-env');
var appEvents = require('../utils/appevents');
var log = require('../utils/log');
var logout = require('../utils/logout');
var RealtimeClient = require('gitter-realtime-client').RealtimeClient;
var wrapExtension = require('gitter-realtime-client').wrapExtension;
var debug = require('debug-proxy')('app:realtime');
var realtimePresenceTracker = require('./realtime-presence-tracking');
var _ = require('lodash');
var reloadOnUpdate = require('./reload-on-update');

var PING_INTERVAL = 30000;
var ENABLE_APP_LAYER_PINGS = true;

// The reason we use this instead of the `utils/is-mobile` module is that
// this is called before contentready and `utils/is-mobile` needs
// contentready before it works
function isMobile() {
  return navigator.userAgent.toLowerCase().indexOf('mobile') >= 0;
}

function authProvider(callback) {
  context.getAccessToken().then(function(accessToken) {
    var mobile = isMobile();
    var presenceDetails = realtimePresenceTracker.getAuthDetails();
    var authMessage = _.extend(
      {
        token: accessToken,
        version: clientEnv['version'],
        connType: mobile ? 'mobile' : 'online',
        client: mobile ? 'mobweb' : 'web'
      },
      presenceDetails
    );
    return callback(authMessage);
  });
}

var handshakeExtension = {
  incoming: wrapExtension(function(message, callback) {
    if (message.channel !== '/meta/handshake') return callback(message);

    if (message.successful) {
      var ext = message.ext;
      if (ext) {
        if (ext.appVersion) {
          reloadOnUpdate.reportServerVersion(ext.appVersion);
        }

        if (ext.context) {
          var c = ext.context;
          if (c.troupe) context.setTroupe(c.troupe);
          if (c.user) context.setUser(c.user);
        }
      }
    }

    callback(message);
  })
};

var terminating = false;

var accessTokenFailureExtension = {
  incoming: wrapExtension(function(message, callback) {
    if (message.error && message.advice && message.advice.reconnect === 'none') {
      // advice.reconnect == 'none': the server has effectively told us to go away for good
      if (!terminating) {
        terminating = true;
        // More needs to be done here!
        log.error('Access denied', message);

        window.alert(
          `Realtime communications with the server have been disconnected. ${message.error}`
        );
        logout();
      }
    }

    callback(message);
  })
};

var client;

function getOrCreateClient() {
  if (client) return client;

  var c = clientEnv['websockets'] || {};
  client = new RealtimeClient({
    fayeUrl: c.fayeUrl,
    authProvider: authProvider,
    fayeOptions: c.options,
    extensions: [handshakeExtension, accessTokenFailureExtension],
    websocketsDisabled: context.hasFeature('disable-websockets')
  });

  client.on('stats', function(type, statName, value) {
    appEvents.trigger('stats.' + type, statName, value);
  });

  client.on('connection:up', function() {
    appEvents.trigger('realtime-connectivity:up');
  });

  client.on('connection:down', function() {
    appEvents.trigger('realtime-connectivity:down');
  });

  if (ENABLE_APP_LAYER_PINGS) {
    setInterval(function() {
      debug('Performing ping');
      client.testConnection('ping');
    }, PING_INTERVAL);
  }

  // Subscribe to the user object for changes to the user
  client.subscribeTemplate({
    urlTemplate: '/v1/user/:userId',
    contextModel: context.contextModel(),
    onMessage: function(message) {
      var user = context.user();

      if (message.operation === 'patch' && message.model && message.model.id === user.id) {
        // Patch the updates onto the user
        user.set(message.model);
      }

      switch (message.notification) {
        case 'user_notification':
          // Only send desktop notifications if the user
          // does not have the desktop client open
          // Fixes https://github.com/troupe/gitter-webapp/issues/1254
          if (context().desktopNotifications) {
            appEvents.trigger(
              'user_notification',
              _.extend(message, { notificationKey: message.chatId })
            );
          }
          break;
        case 'activity':
          appEvents.trigger('activity', message);
          break;
      }
    }
  });

  // Subscribe to the token for changes to check if it was revoked
  if (context.isLoggedIn()) {
    context.getAccessToken().then(accessToken => {
      var contextModel = new Backbone.Model({
        token: accessToken
      });

      let preventTokenRevokedFlow = false;
      appEvents.on('account.delete-start', () => {
        debug('account.delete-start');
        preventTokenRevokedFlow = true;
      });
      appEvents.on('account.delete-stop', () => {
        debug('account.delete-stop');
        preventTokenRevokedFlow = false;
      });
      appEvents.on('account.logout-start', () => {
        debug('account.logout-start');
        preventTokenRevokedFlow = true;
      });

      var templateSubscription = client.subscribeTemplate({
        urlTemplate: '/v1/token/:token',
        contextModel: contextModel,
        onMessage: function(message) {
          switch (message.notification) {
            case 'token_revoked':
              log.error(
                `Token was revoked (preventTokenRevokedFlow=${preventTokenRevokedFlow})`,
                message
              );
              if (!preventTokenRevokedFlow) {
                log.error('Token was revoked and logging out', message);
                logout('/login/token-revoked');
              }
              break;
          }
        }
      });

      templateSubscription.on('subscriptionError', function(channel, err) {
        log.error('Token subscription error' + channel, { exception: err });

        if (err.code === 401 || err.code === 403) {
          log.error(
            `Token subscription unathorized/forbidden (preventTokenRevokedFlow=${preventTokenRevokedFlow}): ${channel}`,
            {
              exception: err
            }
          );
          if (!preventTokenRevokedFlow) {
            log.error(`Token subscription unathorized/forbidden and logging out`, {
              exception: err
            });
            logout('/login/token-revoked');
          }
        }
      });
    });
  }

  return client;
}

appEvents.on('eyeballsInvalid', function(originalClientId) {
  debug('Resetting connection after invalid eyeballs');
  reset(originalClientId);
});

appEvents.on('reawaken', function() {
  debug('Recycling connection after reawaken');
  reset(getClientId());
});

// Cordova events.... doesn't matter if IE8 doesn't handle them
if (document.addEventListener) {
  document.addEventListener(
    'deviceReady',
    function() {
      document.addEventListener(
        'online',
        function() {
          debug('online');
          testConnection('device_ready');
        },
        false
      );
    },
    false
  );
}

function getClientId() {
  return client && client.getClientId();
}

function reset(clientId) {
  getOrCreateClient().reset(clientId);
}

function testConnection(reason) {
  getOrCreateClient().testConnection(reason);
}

module.exports = {
  getClientId: getClientId,

  subscribe: function(channel, callback, context) {
    return getOrCreateClient().subscribe(channel, callback, context);
  },

  testConnection: testConnection,

  reset: reset,

  getClient: function() {
    return getOrCreateClient();
  }
};

window._realtime = module.exports;
