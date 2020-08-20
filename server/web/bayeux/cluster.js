'use strict';

var _ = require('lodash');
var env = require('gitter-web-env');
var logger = env.logger;
var nconf = env.config;
var stats = env.stats;
var errorReporter = env.errorReporter;

var faye = require('gitter-faye');
var fayeRedis = require('@gitterhq/faye-redis');
var deflate = require('permessage-deflate');
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');
var zlib = require('zlib');
var debug = require('debug')('gitter:infra:bayeux');
var Promise = require('bluebird');

/* Disabled after the outage 8 April 2015 XXX investigate further */
// var createDoormanExtension = require('./doorman');
var createPingResponderExtension = require('./ping-responder');
var superClientExtension = require('./super-client');

var fayeLoggingLevel = nconf.get('ws:fayeLogging');
var disableLegacyEndpoint = !!nconf.get('ws:disableLegacyEndpoint');

var STATS_FREQUENCY = 0.01;

function makeServer(options) {
  var endpoint = options.endpoint;
  var redisClient = options.redisClient;
  var redisSubscribeClient = options.redisSubscribeClient;
  var timeout = options.timeout;
  var lightweight = options.lightweight;

  var server = new faye.NodeAdapter({
    mount: endpoint,
    timeout: timeout, // Time before an inactive client is timed out
    ping: nconf.get('ws:fayePing'), // Time between pings from the server to the client
    engine: {
      type: fayeRedis,
      client: redisClient,
      subscriberClient: redisSubscribeClient, // Subscribe. Needs new client,
      interval: 0.5, // Amount of time between `connect` messages
      includeSequence: true,
      namespace: 'fr:',
      statsDelegate: function(category, event) {
        stats.eventHF('bayeux.' + category + '.' + event, 1);
      }
    }
  });

  if (nconf.get('ws:fayePerMessageDeflate')) {
    /* Add permessage-deflate extension to Faye */
    deflate = deflate.configure({
      level: zlib.Z_BEST_SPEED
    });
    server.addWebsocketExtension(deflate);
  }

  server.addExtension(require('./logging'));
  server.addExtension(require('./push-only'));

  /*
   * A lightweight instance does not handle incoming messages and cannot be
   * attached
   */
  if (!lightweight) {
    // Attach event handlers

    server.addExtension(require('./authenticator'));

    /* Disabled after the outage 8 April 2015 XXX investigate further */
    // server.addExtension(createDoormanExtension(server));

    // Authorisation Extension - decides whether the user
    // is allowed to connect to the subscription channel
    //
    server.addExtension(require('./authorisor'));
    server.addExtension(createPingResponderExtension(server));

    server.addExtension(require('./advice-adjuster'));
  }
  server.addExtension(require('./hide-private'));

  if (debug.enabled) {
    ['connection:open', 'connection:close'].forEach(function(event) {
      server._server._engine.bind(event, function(clientId) {
        debug('faye-engine: Client %s: %s', clientId, event);
      });
    });

    /** Some logging */
    ['handshake', 'disconnect'].forEach(function(event) {
      server.bind(event, function(clientId) {
        debug('faye-server: Client %s: %s', clientId, event);
      });
    });
  }

  server.bind('disconnect', function(clientId) {
    // Warning, this event may be called on a different Faye engine from
    // where the socket is residing
    presenceService.socketDisconnected(clientId, function(err) {
      if (err && err.status !== 404) {
        logger.error(
          'bayeux: Error while attempting disconnection of socket ' + clientId + ': ' + err,
          { exception: err }
        );
      }
    });
  });

  shutdown.addHandler('bayeux', 15, function(callback) {
    var engine = server._server._engine;
    engine.disconnect();
    setTimeout(callback, 1000);
  });

  /* Nasty hack, but no way around it */
  server._server._makeResponse = function(message) {
    var response = {};

    if (message.id) response.id = message.id;
    if (message.clientId) response.clientId = message.clientId;
    if (message.channel) response.channel = message.channel;
    if (message.error) response.error = message.error;

    // Our improvement: information for extensions
    if (message._private) response._private = message._private;

    response.successful = !response.error;
    return response;
  };

  return server;
}

/**\
 * Uses given engine to unsubscribe socket with clientId from all room related channels.
 */
const unsubscribeFromTroupe = async function(engine, clientId, troupeId) {
  if (!clientId || !troupeId) return;
  const unsubscribePromises = _.map(['', '/events', '/chatMessages', '/users'], async segment => {
    const channel = `/api/v1/rooms/${troupeId}${segment}`;
    const error = await new Promise(resolve => {
      engine.unsubscribe(clientId, channel, (_, error) => resolve(error));
    });
    if (error) {
      logger.error(`bayeux: error when unsubscribing client ${clientId} from ${channel}, ${error}`);
    }
  });
  return Promise.all(unsubscribePromises);
};

/* This function is used a lot, this version excludes try-catch so that it can be optimised */
function stringifyInternal(object) {
  if (typeof object !== 'object') return JSON.stringify(object);

  var string = JSON.stringify(object);

  // Over cautious
  stats.eventHF('bayeux.message.count', 1, STATS_FREQUENCY);

  if (string) {
    stats.gaugeHF('bayeux.message.size', string.length, STATS_FREQUENCY);
  } else {
    stats.gaugeHF('bayeux.message.size', 0, STATS_FREQUENCY);
  }

  return string;
}

faye.stringify = function(object) {
  try {
    return stringifyInternal(object);
  } catch (e) {
    stats.event('bayeux.message.serialization_error');

    logger.error('Error while serializing JSON message', { exception: e });
    throw e;
  }
};

// additionalData is based off of Raven, https://docs.sentry.io/clients/node/usage/#raven-node-additional-data
function errorLogger(msg, additionalData = {}) {
  const err = new Error(msg);
  logger.error('bayeux-cluster-faye: error ' + msg, { exception: err });
  errorReporter(
    err,
    additionalData.extra,
    _.extend({ module: 'bayeux-cluster' }, additionalData.tags),
    additionalData.request
  );
}

faye.logger = {
  // `fatal` does not exist in our logger
  fatal: errorLogger,
  error: errorLogger,
  warn: logger.warn
};

if (fayeLoggingLevel === 'info' || fayeLoggingLevel === 'debug') {
  faye.logger.info = logger.info;
}

if (fayeLoggingLevel === 'debug') {
  faye.logger.debug = msg => {
    debug('bayeux-cluster-faye: %s', msg);
  };
}

function BayeuxCluster(lightweight) {
  this.lightweight = lightweight;

  /**
   * Create the servers
   */
  var serverNew = (this.serverNew = makeServer({
    endpoint: '/bayeux',
    redisClient: env.redis.createClient(nconf.get('redis_faye')),
    redisSubscribeClient: env.redis.createClient(nconf.get('redis_faye')),
    timeout: nconf.get('ws:fayeTimeout'),
    lightweight: lightweight
  }));

  var serverLegacy = (this.serverLegacy = makeServer({
    endpoint: '/faye',
    redisClient: env.redis.createClient(),
    redisSubscribeClient: env.redis.createClient(),
    timeout: nconf.get('ws:fayeTimeoutOLD'),
    lightweight: lightweight
  }));

  /**
   * Create the clients
   */
  var clientNew = (this.clientNew = serverNew.getClient());
  clientNew.addExtension(superClientExtension);

  var clientLegacy = (this.clientLegacy = serverLegacy.getClient());
  clientLegacy.addExtension(superClientExtension);
}

/** Returns callback(exists) to match faye */
BayeuxCluster.prototype.clientExists = function(clientId, callback) {
  var engineNew = this.serverNew._server._engine;
  var engineLegacy = this.serverLegacy._server._engine;

  // Try the new server first
  engineNew.clientExists(clientId, function(exists) {
    if (exists) return callback(true);

    // Try the legacy server next
    engineLegacy.clientExists(clientId, function(exists) {
      return callback(exists);
    });
  });
};

/**
 * Publish a message on Faye
 */
BayeuxCluster.prototype.publish = function(channel, message) {
  this.clientNew.publish(channel, message);
  this.clientLegacy.publish(channel, message);
};

/**
 * Destroy a client
 */
BayeuxCluster.prototype.destroyClient = function(clientId, callback) {
  if (!clientId) return;

  var engineNew = this.serverNew._server._engine;
  var engineLegacy = this.serverLegacy._server._engine;

  logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');

  var p1 = new Promise(function(resolve) {
    engineNew.destroyClient(clientId, resolve);
  });

  var p2 = new Promise(function(resolve) {
    engineLegacy.destroyClient(clientId, resolve);
  });

  return Promise.all([p1, p2]).nodeify(callback);
};

BayeuxCluster.prototype.unsubscribeFromTroupe = function(clientId, troupeId) {
  var engineNew = this.serverNew._server._engine;
  var engineLegacy = this.serverLegacy._server._engine;
  const newUnsubscribes = unsubscribeFromTroupe(engineNew, clientId, troupeId);
  const legacyUnsubscribes = unsubscribeFromTroupe(engineLegacy, clientId, troupeId);
  return Promise.all(newUnsubscribes, legacyUnsubscribes);
};

/**
 * Attach the faye instance to the server
 */
BayeuxCluster.prototype.attach = function(httpServer) {
  if (this.lightweight) {
    throw new Error('A lightweight bayeux cluster cannot be attached');
  }
  this.serverNew.attach(httpServer);
  this.serverLegacy.attach(httpServer);
};

/** Singleton server */
function BayeuxSingleton(lightweight) {
  this.lightweight = lightweight;

  /**
   * Create the servers
   */
  var server = (this.server = makeServer({
    endpoint: '/bayeux',
    redisClient: env.redis.createClient(nconf.get('redis_faye')),
    redisSubscribeClient: env.redis.createClient(nconf.get('redis_faye')),
    timeout: nconf.get('ws:fayeTimeout'),
    lightweight: lightweight
  }));

  /**
   * Create the clients
   */
  var client = (this.client = server.getClient());
  client.addExtension(superClientExtension);
}

/** Returns callback(exists) to match faye */
BayeuxSingleton.prototype.clientExists = function(clientId, callback) {
  var engine = this.server._server._engine;

  engine.clientExists(clientId, callback);
};

/**
 * Publish a message on Faye
 */
BayeuxSingleton.prototype.publish = function(channel, message) {
  this.client.publish(channel, message);
};

/**
 * Destroy a client
 */
BayeuxSingleton.prototype.destroyClient = function(clientId, callback) {
  if (!clientId) return;

  logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');

  var engine = this.server._server._engine;
  engine.destroyClient(clientId, callback);
};

/**
 *  Unsubscribe socket from all room related channels
 */
BayeuxSingleton.prototype.unsubscribeFromTroupe = function(clientId, troupeId) {
  var engine = this.server._server._engine;
  return unsubscribeFromTroupe(engine, clientId, troupeId);
};

/**
 * Attach the faye instance to the server
 */
BayeuxSingleton.prototype.attach = function(httpServer) {
  if (this.lightweight) {
    throw new Error('A lightweight bayeux cluster cannot be attached');
  }
  this.server.attach(httpServer);
};

if (disableLegacyEndpoint) {
  module.exports = BayeuxSingleton;
} else {
  module.exports = BayeuxCluster;
}
