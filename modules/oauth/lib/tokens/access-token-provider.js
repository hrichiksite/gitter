'use strict';

var persistenceService = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var random = require('../random');
const appEvents = require('gitter-web-appevents');

module.exports = {
  getToken: function(userId, clientId, callback) {
    if (!userId) return callback();

    /* TODO: confirm: Its much quicker to lookup the token in MongoDB than it is to generate one with randomByes and then attempt and upsert */
    /* Lookup and possible create */
    return persistenceService.OAuthAccessToken.findOne(
      {
        userId: userId,
        clientId: clientId
      },
      {
        _id: 0,
        token: 1
      },
      {
        lean: true
      }
    )
      .exec()
      .then(function(oauthAccessToken) {
        if (oauthAccessToken && oauthAccessToken.token) {
          return oauthAccessToken.token;
        }

        /* Generate a token and attempt an upsert */
        return random.generateToken().then(function(token) {
          userId = mongoUtils.asObjectID(userId);
          clientId = mongoUtils.asObjectID(clientId);

          return persistenceService.OAuthAccessToken.findOneAndUpdate(
            { userId: userId, clientId: clientId },
            {
              $setOnInsert: {
                userId: userId,
                clientId: clientId,
                token: token
              }
            },
            { upsert: true, new: true }
          )
            .exec()
            .then(function(result) {
              return result.token;
            });
        });
      })
      .nodeify(callback);
  },

  validateToken: function(token, callback) {
    return persistenceService.OAuthAccessToken.findOne(
      { token: token },
      { _id: 0, userId: 1, clientId: 1 }
    )
      .lean()
      .exec()
      .then(function(accessToken) {
        if (!accessToken) return null;

        var clientId = accessToken.clientId;
        var userId = accessToken.userId; // userId CAN be null

        if (!clientId) return null; // unknown client

        return [userId, clientId];
      })
      .nodeify(callback);
  },

  cacheToken: function(userId, clientId, token, callback) {
    return callback();
  },

  deleteToken: async function(token, callback) {
    try {
      const accessToken = await persistenceService.OAuthAccessToken.findOne({ token: token });

      await accessToken.remove();

      // Trigger the realtime socket cleanup
      appEvents.tokenRevoked({
        userId: accessToken.userId,
        token: accessToken.token
      });

      if (callback) {
        callback();
      }
    } catch (err) {
      if (callback) {
        callback(err);
      }
      throw err;
    }
  },

  invalidateCache: function(callback) {
    return callback();
  }
};
