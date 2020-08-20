'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;

var presenceService = require('gitter-web-presence');
var restful = require('../../services/restful');
var restSerializer = require('../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var StatusError = require('statuserror');
var bayeuxExtension = require('./extension');
var Promise = require('bluebird');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var debug = require('debug')('gitter:app:bayeux-authorisor');
var recentRoomService = require('gitter-web-rooms/lib/recent-room-service');
const tokenProvider = require('gitter-web-oauth/lib/tokens');

var survivalMode = !!process.env.SURVIVAL_MODE || false;

if (survivalMode) {
  logger.error('WARNING: Running in survival mode');
}

// TODO: use a lightweight routing library for this....
// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  {
    re: /^\/api\/v1\/rooms\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateTroupe
  },
  {
    re: /^\/api\/v1\/rooms\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubTroupeCollection
  },
  {
    re: /^\/api\/v1\/rooms\/(\w+)\/(\w+)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubSubTroupeCollection
  },
  {
    re: /^\/api\/v1\/user\/(\w+)\/(\w+)$/,
    validator: validateUserForUserSubscription,
    populator: populateSubUserCollection
  },
  {
    re: /^\/api\/v1\/user\/(\w+)\/rooms\/(\w+)\/unreadItems$/,
    validator: validateUserForUserSubscription,
    populator: populateUserUnreadItemsCollection
  },
  {
    re: /^\/api\/v1\/user\/(\w+)$/,
    validator: validateUserForUserSubscription
  },
  {
    re: /^\/api\/v1\/token\/(\w+)$/,
    validator: validateTokenForTokenSubscription
  },
  {
    re: /^\/api\/v1\/ping(\/\w+)?$/,
    validator: validateUserForPingSubscription
  },
  {
    re: /^\/api\/private\/diagnostics$/,
    validator: validateUserForPingSubscription
  }
];

function permissionToRead(userId, troupeId) {
  return policyFactory.createPolicyForUserIdInRoomId(userId, troupeId).then(function(policy) {
    return policy.canRead();
  });
}

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForSubTroupeSubscription(options) {
  var userId = options.userId;
  var match = options.match;
  var ext = options.message && options.message.ext;

  var troupeId = match[1];

  if (!mongoUtils.isLikeObjectId(troupeId)) {
    return Promise.reject(new StatusError(400, 'Invalid ID: ' + troupeId));
  }

  var promise = permissionToRead(userId, troupeId);

  /** Reassociate the socket with a new room */
  return promise.tap(function(access) {
    if (!access) return;
    const hasEyeballs = ext && ext.reassociate && !!ext.reassociate.eyeballs;
    return presenceService
      .socketReassociated(options.clientId, userId, troupeId, hasEyeballs)
      .then(function() {
        // Update the lastAccessTime for the room
        if (userId) {
          return recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
        }
      })
      .catch(function(err) {
        logger.error('Unable to reassociate connection or update last access: ', {
          exception: err,
          userId: userId,
          troupeId: troupeId
        });
      });
  });
}

// This is only used by the native client. The web client publishes to
// the url
function validateUserForPingSubscription(/* options */) {
  return Promise.resolve(true);
}

// This strategy ensures that a user can access a URL under a /user/ URL
function validateUserForUserSubscription(options) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];

  // All /user/ subscriptions need to be authenticated
  if (!userId) return Promise.resolve(false);

  if (!mongoUtils.isLikeObjectId(userId)) {
    return Promise.reject(new StatusError(400, 'Invalid ID: ' + userId));
  }

  var result = mongoUtils.objectIDsEqual(userId, subscribeUserId);

  return Promise.resolve(result);
}

// This strategy ensures that a user can access a URL under a /token/ URL
function validateTokenForTokenSubscription(options) {
  var userId = options.userId;
  var match = options.match;
  var subscribedToken = match[1];

  // All /token/ subscriptions need to be authenticated
  if (!userId) return Promise.resolve(false);

  return tokenProvider.validateToken(subscribedToken).then(result => {
    const tokenUserId = result && result[0];
    return tokenUserId && mongoUtils.objectIDsEqual(userId, tokenUserId);
  });
}

function dataToSnapshot(type) {
  return function(data) {
    return { type: type, data: data };
  };
}

function populateSubUserCollection({ userId, match }) {
  var subscribeUserId = match[1];
  var collection = match[2];

  if (!userId || userId !== subscribeUserId) {
    return Promise.resolve();
  }

  switch (collection) {
    case 'groups':
      return restful.serializeGroupsForUserId(userId).then(dataToSnapshot('user.groups'));

    case 'rooms':
    case 'troupes':
      return restful.serializeTroupesForUser(userId).then(dataToSnapshot('user.rooms'));

    case 'orgs':
      return restful.serializeOrgsForUserId(userId).then(dataToSnapshot('user.orgs'));

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Promise.resolve();
}

function populateTroupe({ userId, match, snapshot = false }) {
  var troupeId = match[1];

  /**
   * For a troupe, the default is no snapshot, but if snapshot=true,
   * then we return the current troupe to the user
   */

  if (!snapshot) return Promise.resolve();

  var strategy = new restSerializer.TroupeIdStrategy({
    currentUserId: userId,
    includePermissions: true,
    includeGroups: true,
    includeOwner: true,
    includeBackend: true,
    includeAssociatedRepo: true
  });
  return restSerializer.serializeObject(troupeId, strategy).then(dataToSnapshot('room'));
}

function populateSubTroupeCollection({
  userId,
  match,
  snapshot: { limit, lean, lookups, beforeInclId, includeThreads } = {}
}) {
  var troupeId = match[1];
  var collection = match[2];

  switch (collection) {
    case 'chatMessages':
      if (survivalMode) {
        return Promise.resolve(dataToSnapshot('room.events')([]));
      }
      return restful
        .serializeChatsForTroupe(troupeId, userId, {
          limit,
          lean,
          lookups,
          beforeInclId,
          includeThreads
        })
        .then(dataToSnapshot('room.chatMessages'));

    case 'users':
      if (survivalMode) {
        return Promise.resolve(dataToSnapshot('room.events')([]));
      }
      return restful
        .serializeUsersForTroupe(troupeId, userId, { limit, lean })
        .then(dataToSnapshot('room.users'));

    case 'events':
      if (survivalMode) {
        return Promise.resolve(dataToSnapshot('room.events')([]));
      }

      return restful.serializeEventsForTroupe(troupeId, userId).then(dataToSnapshot('room.events'));

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Promise.resolve();
}

function populateSubSubTroupeCollection({ match }) {
  var troupeId = match[1];
  var collection = match[2];
  var subId = match[3];
  var subCollection = match[4];

  switch (collection + '-' + subCollection) {
    case 'chatMessages-readBy':
      return restful
        .serializeReadBysForChat(troupeId, subId)
        .then(dataToSnapshot('room.chatMessages.readBy'));

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Promise.resolve();
}

function populateUserUnreadItemsCollection({ userId, match }) {
  var subscriptionUserId = match[1];
  var troupeId = match[2];

  if (!userId || userId !== subscriptionUserId) {
    return Promise.resolve();
  }

  return restful
    .serializeUnreadItemsForTroupe(troupeId, userId)
    .then(dataToSnapshot('user.room.unreadItems'));
}

// Authorize a sbscription message
function authorizeSubscribe(message, callback) {
  var clientId = message.clientId;

  return presenceService
    .lookupUserIdForSocket(clientId)
    .spread(function(userId, exists) {
      if (!exists) {
        debug('Client %s does not exist. userId=%s', clientId, userId);
        throw new StatusError(401, 'Client ' + clientId + ' not authenticated');
      }

      var match = null;

      var hasMatch = routes.some(function(route) {
        var m = route.re.exec(message.subscription);
        if (m) {
          match = { route: route, match: m };
        }
        return m;
      });

      if (!hasMatch) {
        throw new StatusError(404, 'Unknown subscription ' + message.subscription);
      }

      var validator = match.route.validator;
      var m = match.match;

      return validator({ userId: userId, match: m, message: message, clientId: clientId }).then(
        function(allowed) {
          return [userId, allowed];
        }
      );
    })
    .nodeify(callback);
}

//
// Authorisation Extension - decides whether the user
// is allowed to connect to the subscription channel
//
module.exports = bayeuxExtension({
  channel: '/meta/subscribe',
  name: 'authorisor',
  failureStat: 'bayeux.subscribe.deny',
  skipSuperClient: true,
  skipOnError: true,
  privateState: true,
  incoming: function(message, req, callback) {
    // Do we allow this user to connect to the requested channel?
    return authorizeSubscribe(message)
      .spread(function(userId, allowed) {
        if (!allowed) {
          throw new StatusError(403, 'Authorisation denied.');
        }

        message._private.authorisor = {
          snapshot: message.ext && message.ext.snapshot,
          userId: userId
        };

        return message;
      })
      .nodeify(callback);
  },

  outgoing: function(message, req, callback) {
    var clientId = message.clientId;

    var state = message._private && message._private.authorisor;
    /**
     * This snapshot comes from extra metadata in bayeux message (`message.ext.snapshot`).
     * Client can set it up to whatever they want. Our own application is using methods `getSnapshotState`
     * which are defined on LiveCollections like `public/js/collections/infinite-mixin.js`. This mechanism
     * is defined in `realtime-client`.
     * It can have following values:
     *  - `{ lean: true, limit: 25 }` `public/js/collections/users`
     *  - `false` `public/js/components/live-context`
     *  - `true/false` `public/js/components/realtime-troupe-listener`
     *  - `{ lookups: ['user'] }` `public/js/collections/chat.js`
     *  - `{ limit, beforeInclId }` `public/js/collections/infinite-mixin.js`
     *  - and possibly more coming from clients implemented outside of `webapp`
     */
    var snapshot = state && state.snapshot;
    var userId = state && state.userId;

    var match = null;

    var hasMatch = routes.some(function(route) {
      var m = route.re.exec(message.subscription);
      if (m) {
        match = { route: route, match: m };
      }
      return m;
    });

    if (!hasMatch) return callback(null, message);

    var populator = match.route.populator;
    var m = match.match;

    /* The populator is all about generating the snapshot for the client */
    if (!clientId || !populator || snapshot === false) return callback(null, message);

    var startTime = Date.now();

    populator({ userId: userId, match: m, snapshot: snapshot })
      .then(function(snapshot) {
        if (!snapshot) return message;

        stats.responseTime('bayeux.snapshot.time', Date.now() - startTime);
        stats.responseTime('bayeux.snapshot.time.' + snapshot.type, Date.now() - startTime);

        if (snapshot.data === undefined && snapshot.meta === undefined) return message;

        if (!message.ext) message.ext = {};
        message.ext.snapshot = snapshot.data;
        message.ext.snapshot_meta = snapshot.meta;

        return message;
      })
      .then(message => callback(null, message), err => callback(err));
  }
});
