'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var nconf = env.config;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix') });
var debug = require('debug')('gitter:infra:faye-logging');

function getClientIp(req) {
  if (!req) return;

  if (req.headers && req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'];
  }

  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  return req.ip;
}

module.exports = {
  incoming: function(message, req, callback) {
    switch (message.channel) {
      case '/meta/handshake':
        stats.eventHF('bayeux.handshake');
        break;

      case '/meta/connect':
        var tags = [];
        if (message.connectionType) {
          tags.push('connectionType:' + message.connectionType);
        }
        statsd.increment('bayeux.connect', 1, 0.25, tags);
        break;

      case '/meta/subscribe':
        stats.eventHF('bayeux.subscribe');
        debug('bayeux: subscribe. clientId=%s, subs=%s', message.clientId, message.subscription);
        break;
    }

    callback(message);
  },

  outgoing: function(message, req, callback) {
    if (message.channel === '/meta/handshake') {
      var ip = getClientIp(req);
      var clientId = message.clientId;

      debug('bayeux: handshake complete. ip=%s, clientId=%s', ip, clientId);
    }
    callback(message);
  }
};
