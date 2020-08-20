'use strict';

/**
 * URI lookup service is a supersimple service for managing who owns what URIs
 *
 * It is separate from uri-service as that would create circular dependencies
 */

var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var debug = require('debug')('gitter:app:uri-lookup-service');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const cursor = persistence.UriLookup.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

function discoverUserUri(uri) {
  // Double-check the troupe and user tables to find this uri
  var repoStyle = uri.indexOf('/') >= 0;

  if (repoStyle) return null;

  return persistence.User.findOne({ username: uri }, 'username', { lean: true }).exec();
}

function discoverRoomUri(lcUri) {
  return persistence.Troupe.findOne({ lcUri: lcUri }, 'uri', { lean: true }).exec();
}

function discoverGroupUri(lcUri) {
  return persistence.Group.findOne(
    { lcHomeUri: lcUri },
    {
      homeUri: 1
    },
    {
      lean: true
    }
  ).exec();
}

function discoverUri(uri) {
  var lcUri = uri.toLowerCase();

  debug('Attempting to search through users and troupes to find %s', uri);

  return Promise.join(
    discoverUserUri(uri),
    discoverRoomUri(lcUri),
    discoverGroupUri(lcUri),
    function(user, troupe, group) {
      debug('Found user=%s troupe=%s group=%s', !!user, !!troupe, !!group);

      /* Found user. Add to cache and continue */
      if (user) {
        return reserveUriForUsername(user._id, user.username);
      }

      if (troupe) {
        return reserveUriForTroupeId(troupe._id, troupe.uri);
      }

      if (group) {
        return reserveUriForGroupId(group._id, group.homeUri);
      }

      /* Last ditch attempt. Look for a room that has been renamed */
      /* TODO: look for users who have been renamed too */
      return persistence.Troupe.findOne(
        { renamedLcUris: lcUri },
        { uri: 1, lcUri: 1 },
        { lean: true }
      )
        .exec()
        .then(function(renamedTroupe) {
          if (!renamedTroupe) return null;
          debug('Room %s has been renamed to %s', lcUri, renamedTroupe.lcUri);

          /* Don't save this lookup */
          return { uri: renamedTroupe.lcUri, troupeId: renamedTroupe._id };
        });
    }
  );
}

/**
 * Lookup the owner of a URI
 * @return promise of a UriLookup
 */
function lookupUri(uri) {
  var lcUri = uri.toLowerCase();

  debug('URI lookup: %s', uri);

  return persistence.UriLookup.findOne({ uri: lcUri })
    .exec()
    .then(function(uriLookup) {
      debug('URI lookup returned a result? %s', !!uriLookup);

      if (uriLookup && (uriLookup.userId || uriLookup.troupeId || uriLookup.groupId))
        return uriLookup;

      return discoverUri(uri);
    });
}

/**
 * Remove the username for a user
 * @return promise of nothing
 */
function removeUsernameForUserId(userId) {
  return persistence.UriLookup.findOneAndRemove({ userId: userId }).exec();
}

function reserveUriForUsername(userId, username) {
  debug('Reserve URI: userId=%s, username=%s', userId, username);

  var lcUri = username.toLowerCase();
  userId = mongoUtils.asObjectID(userId);

  return persistence.UriLookup.findOneAndUpdate(
    {
      $or: [
        {
          uri: lcUri
        },
        {
          userId: userId
        }
      ]
    },
    {
      $set: {
        uri: lcUri,
        userId: userId
      },
      $unset: {
        troupeId: true,
        groupId: true
      }
    },
    {
      upsert: true,
      new: true
    }
  ).exec();
}

function removeBadUri(uri) {
  var lcUri = uri.toLowerCase();

  return persistence.UriLookup.remove({ uri: lcUri }).exec();
}

function reserveUriForTroupeId(troupeId, uri) {
  debug('Reserve URI: troupeId=%s, uri=%s', troupeId, uri);

  var lcUri = uri.toLowerCase();
  troupeId = mongoUtils.asObjectID(troupeId);

  return persistence.UriLookup.findOneAndUpdate(
    {
      $or: [
        {
          uri: lcUri
        },
        {
          troupeId: troupeId
        }
      ]
    },
    {
      $set: {
        uri: lcUri,
        troupeId: troupeId
      },
      $unset: {
        userId: true,
        groupId: true
      }
    },
    {
      upsert: true,
      new: true
    }
  ).exec();
}

function reserveUriForGroupId(groupId, uri) {
  debug('Reserve URI: groupId=%s, uri=%s', groupId, uri);

  var lcUri = uri.toLowerCase();
  groupId = mongoUtils.asObjectID(groupId);

  return persistence.UriLookup.findOneAndUpdate(
    {
      $or: [
        {
          uri: lcUri
        },
        {
          groupId: groupId
        }
      ]
    },
    {
      $set: {
        uri: lcUri,
        groupId: groupId
      },
      $unset: {
        userId: true,
        troupeId: true
      }
    },
    {
      upsert: true,
      new: true
    }
  ).exec();
}

module.exports = {
  getCursorByUserId,
  reserveUriForTroupeId: reserveUriForTroupeId,
  reserveUriForGroupId: reserveUriForGroupId,
  lookupUri: lookupUri,
  removeUsernameForUserId: removeUsernameForUserId,
  reserveUriForUsername: reserveUriForUsername,
  removeBadUri: removeBadUri
};
