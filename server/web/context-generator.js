'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var _ = require('lodash');
const debug = require('debug')('gitter:app:context-generator');
var restSerializer = require('../serializers/rest-serializer');
var userService = require('gitter-web-users');
var roomMetaService = require('gitter-web-rooms/lib/room-meta-service');
var contextGeneratorRequest = require('./context-generator-request');

function serializeUser(user) {
  var strategy = new restSerializer.UserStrategy({
    exposeRawDisplayName: true,
    includeScopes: true,
    includePermissions: true,
    showPremiumStatus: true,
    includeProviders: true
  });

  return restSerializer.serializeObject(user, strategy);
}

function serializeTroupe(troupe, user) {
  var strategy = new restSerializer.TroupeStrategy({
    currentUserId: user ? user.id : null,
    currentUser: user,
    includePermissions: true,
    includeOwner: true,
    includeGroups: true,
    includeBackend: true,
    includeAssociatedRepo: true
  });

  return restSerializer.serializeObject(troupe, strategy);
}

function serializeGroup(group, user) {
  var strategy = new restSerializer.GroupStrategy({
    currentUser: user,
    currentUserId: user && user._id
  });

  return restSerializer.serializeObject(group, strategy);
}

function serializeTroupeId(troupeId, user) {
  var strategy = new restSerializer.TroupeIdStrategy({
    currentUserId: user ? user.id : null,
    currentUser: user,
    includePermissions: true,
    includeOwner: true,
    includeGroups: true,
    includeBackend: true,
    includeAssociatedRepo: true
  });

  return restSerializer.serializeObject(troupeId, strategy);
}

/**
 * Returns the promise of a mini-context
 */
function generateMainMenuContext(req) {
  var user = req.user;
  var uriContext = req.uriContext;

  var troupe = uriContext && uriContext.troupe;
  const group = uriContext && uriContext.group;
  var roomMember = uriContext && uriContext.roomMember;

  return Promise.all([
    contextGeneratorRequest(req),
    user ? serializeUser(user) : null,
    serializeGroup(group, user),
    troupe ? serializeTroupe(troupe, user) : undefined
  ]).spread(function(reqContextHash, serializedUser, serializedGroup, serializedTroupe) {
    var serializedContext = _.extend({}, reqContextHash, {
      roomMember: roomMember,
      user: serializedUser,
      group: serializedGroup,
      troupe: serializedTroupe
    });

    return serializedContext;
  });
}

async function generateOrgContext(req) {
  const { user } = req;
  const { uriContext } = req;
  assert(uriContext);
  const { group } = uriContext;
  assert(group);

  const [basicContext, serializedGroup] = await Promise.all([
    generateBasicContext(req),
    serializeGroup(group, user)
  ]);

  return _.extend({}, basicContext, {
    group: serializedGroup
  });
}

function generateBasicContext(req) {
  var user = req.user;

  return Promise.all([contextGeneratorRequest(req), user ? serializeUser(user) : null]).spread(
    function(reqContextHash, serializedUser) {
      return _.extend({}, reqContextHash, {
        user: serializedUser
      });
    }
  );
}

/**
 * Generates a context for sending over a bayeux connection
 */
function generateSocketContext(userId, troupeId) {
  function getUser() {
    if (!userId) return Promise.resolve(null);
    return userService.findById(userId);
  }

  return getUser()
    .then(function(user) {
      return [user && serializeUser(user), troupeId && serializeTroupeId(troupeId, user)];
    })
    .spread(function(serializedUser, serializedTroupe) {
      return {
        user: serializedUser || undefined,
        troupe: serializedTroupe || undefined
      };
    });
}

/**
 * Generates the context to send for a main-frame
 */
function generateTroupeContext(req, extras) {
  var user = req.user;
  var uriContext = req.uriContext;
  var troupe = uriContext && uriContext.troupe;
  var roomMember = uriContext && uriContext.roomMember;

  debug(
    `generateTroupeContext -> roomMember=${roomMember} ${
      troupe ? `troupe=${troupe.lcUri}(${troupe._id})` : ''
    } ${user ? `user=${user.username}(${user._id})` : ''}`
  );

  return Promise.all([
    contextGeneratorRequest(req),
    user ? serializeUser(user) : null,
    troupe ? serializeTroupe(troupe, user) : undefined,
    // TODO: if we keep serializing troupes with metadata, we can replace following with troupe.meta.welcomeMessage
    troupe && troupe._id
      ? roomMetaService.findMetaByTroupeId(troupe._id, ['welcomeMessage'])
      : false
  ]).spread(function(reqContextHash, serializedUser, serializedTroupe, { welcomeMessage }) {
    var roomHasWelcomeMessage = !!(
      welcomeMessage &&
      welcomeMessage.text &&
      welcomeMessage.text.length
    );

    return _.extend(
      {},
      reqContextHash,
      {
        roomMember: roomMember,
        user: serializedUser,
        troupe: serializedTroupe,
        roomHasWelcomeMessage: roomHasWelcomeMessage
      },
      extras
    );
  });
}

module.exports = {
  generateBasicContext,
  generateMainMenuContext,
  generateSocketContext,
  generateTroupeContext,
  generateOrgContext
};
