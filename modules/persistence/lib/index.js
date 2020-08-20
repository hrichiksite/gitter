'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('persistence');
var errorReporter = env.errorReporter;
var mongoose = require('gitter-web-mongoose-bluebird');
var debug = require('debug')('gitter:infra:persistence-service');
var mongoDebug = require('node-mongodb-debug-log');
var indexManager = require('./index-manager');

// Install inc and dec number fields in mongoose
require('mongoose-number')(mongoose);

/* Establishes a connection to the mongodb server, with fallback, etc */
env.mongo.configureMongoose(mongoose);

var connection = mongoose.connection;

if (debug.enabled) {
  mongoose.set('debug', true);
}

mongoDebug.install(mongoose.mongo, {
  debugName: 'gitter:infra:mongo',
  slowLogMS: 10
});

connection.on('error', function(err) {
  logger.info('MongoDB connection error', { exception: err });
  errorReporter(err, { connection_error: true }, { module: 'persistence' });
});

function createExports(schemas) {
  var ex = {
    schemas: {}
  };

  var models = [];

  Object.keys(schemas).forEach(function(key) {
    var module = schemas[key];
    var m = module.install(mongoose);
    var model = m.model;
    ex[key] = model;
    models.push(model);
    ex.schemas[key + 'Schema'] = m.schema;
  });

  if (process.env.NO_AUTO_INDEX) {
    logger.info('Skipping auto indexing');
  } else {
    // Automatically do this at startup, for now
    indexManager
      .ensureIndices(models)
      .then(function() {
        logger.info('Indices configured');
      })
      .catch(function(err) {
        logger.info('Index failure', { exception: err });
        errorReporter(err, { index_error: true }, { module: 'persistence' });
      });
  }

  return ex;
}

var schemas = {
  User: require('./schemas/user-schema'),
  Identity: require('./schemas/identity-schema'),
  UserTroupeLastAccess: require('./schemas/user-troupe-last-access-schema'),
  UserTroupeFavourites: require('./schemas/user-troupe-favourites-schema'),
  UserGroupFavourites: require('./schemas/user-group-favourites-schema'),
  Group: require('./schemas/group-schema'),
  Troupe: require('./schemas/troupe-schema'),
  TroupeMeta: require('./schemas/troupe-meta-schema'),
  TroupeUser: require('./schemas/troupe-user-schema'),
  UserSettings: require('./schemas/user-settings-schema'),
  ChatMessage: require('./schemas/chat-message-schema'),
  ChatMessageBackup: require('./schemas/chat-message-backup-schema'),
  ChatMessageReport: require('./schemas/chat-message-report-schema'),
  Event: require('./schemas/event-schema'),
  OAuthClient: require('./schemas/oauth-client-schema'),
  OAuthCode: require('./schemas/oauth-code-schema'),
  OAuthAccessToken: require('./schemas/oauth-access-token-schema'),
  PushNotificationDevice: require('./schemas/push-notification-device-schema'),
  UriLookup: require('./schemas/uri-lookup-schema'),
  Subscription: require('./schemas/subscription-schema'),
  FeatureToggle: require('./schemas/feature-toggle-schema'),
  TroupeRemovedUser: require('./schemas/troupe-removed-user-schema'),
  TroupeInvite: require('./schemas/troupe-invite-schema'),
  KnownExternalAccess: require('./schemas/known-external-access-schema'),
  Fingerprint: require('./schemas/fingerprint-schema')
};

module.exports = createExports(schemas);
