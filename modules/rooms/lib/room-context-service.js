'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var uriResolver = require('./uri-resolver');
var StatusError = require('statuserror');
var oneToOneRoomService = require('./one-to-one-room-service');
var debug = require('debug')('gitter:app:room-context-service');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var groupService = require('gitter-web-groups/lib/group-service');

/**
 * Given a user and a URI returns (promise of) a context object.
 * The context object looks like:
 * ```js
 * {
 *   troupe: ....,       // The resolved room
 *   uri: ....,          // The uri of the resolved room
 *   oneToOneUser: ....  // Optional. For a one-to-one, the other user
 * }
 * ```
 *
 * Various exceptions can be thrown:
 * 400: uri not supplied
 * 301: redirect
 * 401: login required
 * 404: access denied
 */
function findContextForUri(user, uri, options) {
  debug(
    `findRoomContext user=${user && user.username}(${user &&
      user.id}) uri=${uri} options=${options}`
  );

  var userId = user && user.id;

  if (!uri) throw new StatusError(400, 'uri required');

  /* First off, try use local data to figure out what this url is for */
  return uriResolver(user && user.id, uri, options).then(function(resolved) {
    if (!resolved) throw new StatusError(404);

    var resolvedUser = resolved.user;
    var resolvedTroupe = resolved.room;
    var roomMember = resolved.roomMember;
    var resolvedGroup = resolved.group;

    // The uri resolved to a user, we need to do a one-to-one
    if (resolvedUser) {
      if (!user) {
        debug('uriResolver returned user for uri=%s', uri);
        throw new StatusError(401); // Login required
      }

      if (mongoUtils.objectIDsEqual(resolvedUser.id, userId)) {
        return {
          uri: resolvedUser.username,
          ownUrl: true
        };
      }

      debug('localUriLookup returned user for uri=%s. Finding or creating one-to-one', uri);

      return oneToOneRoomService
        .findOrCreateOneToOneRoom(user, resolvedUser.id)
        .spread(function(troupe, resolvedUser) {
          return policyFactory.createPolicyForRoom(user, troupe).then(function(policy) {
            return {
              troupe: troupe,
              policy: policy,
              roomMember: true,
              oneToOneUser: resolvedUser,
              uri: resolvedUser.username
            };
          });
        });
    }

    if (resolvedTroupe) {
      return policyFactory.createPolicyForRoom(user, resolvedTroupe).then(function(policy) {
        return policy.canRead().then(function(access) {
          if (!access) {
            // If the user has reached the org room
            // but does not have access, redirect them
            // to the group home
            if (uri.indexOf('/') < 0 && resolvedTroupe.groupId) {
              debug('Redirecting on ORG room permission denied');

              return groupService
                .findById(resolvedTroupe.groupId, { lean: true })
                .then(function(group) {
                  if (group && group.homeUri) {
                    var err = new StatusError(301);
                    err.path = '/' + group.homeUri;
                    throw err;
                  }

                  throw new StatusError(404);
                });
            } else {
              throw new StatusError(404);
            }
          }

          return {
            group: resolvedGroup,
            troupe: resolvedTroupe,
            policy: policy,
            uri: resolvedTroupe.uri,
            roomMember: roomMember
          };
        });
      });
    }

    if (resolvedGroup) {
      return policyFactory.createPolicyForGroupId(user, resolvedGroup._id).then(function(policy) {
        return policy.canRead().then(function(access) {
          if (!access) {
            throw new StatusError(404);
          }

          return {
            group: resolvedGroup,
            policy: policy,
            uri: resolvedGroup.homeUri
          };
        });
      });
    }

    // No user, no room. 404
    throw new StatusError(404);
  });
}

/**
 * Resolves a uri in the context of a user.
 *
 * Will only create a room in the case of a one-to-one
 */
function findContextForRoom(user, uri) {
  debug('findContextForRoom %s %s %j', user && user.username, uri);

  var userId = user && user.id;

  if (!uri) throw new StatusError(400, 'uri required');

  /* First off, try use local data to figure out what this url is for */
  return uriResolver(user && user.id, uri, { ignoreCase: true }).then(function(resolved) {
    if (!resolved) throw new StatusError(404);

    var resolvedUser = resolved.user;
    var resolvedTroupe = resolved.room;

    // The uri resolved to a user, we need to do a one-to-one
    if (resolvedUser) {
      if (!user) {
        debug('uriResolver returned user for uri=%s', uri);
        throw new StatusError(401); // Login required
      }

      if (mongoUtils.objectIDsEqual(resolvedUser.id, userId)) {
        throw new StatusError(404);
      }

      debug('localUriLookup returned user for uri=%s. Finding or creating one-to-one', uri);

      return oneToOneRoomService
        .findOrCreateOneToOneRoom(user, resolvedUser.id)
        .spread(function(troupe /*, resolvedUser*/) {
          return troupe;
        });
    }

    if (resolvedTroupe) {
      return policyFactory.createPolicyForRoom(user, resolvedTroupe).then(function(policy) {
        return policy.canRead().then(function(access) {
          if (!access) {
            throw new StatusError(404);
          }

          return resolvedTroupe;
        });
      });
    }

    // No user, no room. 404
    throw new StatusError(404);
  });
}

function findContextForGroup(user, uri, options) {
  debug('findContextForGroup %s %s %j', user && user.username, uri, options);
  var ignoreCase = options && options.ignoreCase;

  if (!uri) throw new StatusError(400, 'uri required');

  return groupService.findByUri(uri, { lean: true }).then(function(group) {
    if (!group) throw new StatusError(404);

    return policyFactory
      .createPolicyForGroupId(user, group._id)
      .then(function(policy) {
        return policy.canRead().then(function(access) {
          if (!access) {
            throw new StatusError(404);
          }

          return {
            group: group,
            policy: policy,
            uri: group.uri
          };
        });
      })
      .tap(function(uriContext) {
        // URI mismatch? Perhaps we should redirect...
        if (uriContext.uri !== uri) {
          if (ignoreCase && uriContext.uri.toLowerCase() === uri.toLowerCase()) {
            logger.info('Ignoring incorrect case for room', {
              providedUri: uri,
              correctUri: uriContext.uri
            });
          } else {
            var redirect = new StatusError(301);
            redirect.path = '/' + uriContext.uri;
            throw redirect;
          }
        }
      });
  });
}

module.exports = {
  findContextForUri: Promise.method(findContextForUri),
  findContextForRoom: Promise.method(findContextForRoom),
  findContextForGroup: Promise.method(findContextForGroup)
};
