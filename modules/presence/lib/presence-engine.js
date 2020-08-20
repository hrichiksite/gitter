'use strict';

var env = require('gitter-web-env');
var config = env.config;
var logger = env.logger.get('presence');
var events = require('events');
var StatusError = require('statuserror');
var debug = require('debug')('gitter:app:presence-engine');
var presenceService = new events.EventEmitter();
var uniqueIds = require('mongodb-unique-ids');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var _ = require('lodash');

function createClient() {
  return env.ioredis.createClient(null, {
    keyPrefix: config.get('presence:prefix') + ':'
  });
}

var redisClient = createClient();

function defineCommand(name, script, keys) {
  redisClient.defineCommand(name, {
    lua: fs.readFileSync(path.join(__dirname, '..', 'redis-lua', script + '.lua')),
    numberOfKeys: keys
  });
}

defineCommand('presenceAssociateAnon', 'presence-associate-anon', 3);
defineCommand('presenceAssociate', 'presence-associate', 6);
defineCommand('presenceCategorizeUsers', 'presence-categorize-users', 4);
defineCommand('presenceDisassociateAnon', 'presence-disassociate-anon', 3);
defineCommand('presenceDisassociate', 'presence-disassociate', 7);
defineCommand('presenceEyeballsOff', 'presence-eyeballs-off', 3);
defineCommand('presenceEyeballsOn', 'presence-eyeballs-on', 3);
defineCommand('presenceReassociate', 'presence-reassociate', 4);

var ACTIVE_USERS_KEY = 'active_u';
var MOBILE_USERS_KEY = 'mobile_u';

var ACTIVE_SOCKETS_KEY = 'activesockets';

function keyUserLock(userId) {
  return 'ul:' + userId;
}

function keySocketUser(socketId) {
  return 'sh:' + socketId;
}

function keyTroupeUsers(troupeId) {
  return 'tu:' + troupeId;
}

function keyUserSockets(userId) {
  return 'us:' + userId;
}

function getUniqueUsersAndTroupes(userTroupes) {
  var userIds = [];
  var troupeIds = [];
  var result = [userIds, troupeIds];

  var u = {},
    t = {};
  for (var i = 0; i < userTroupes.length; i++) {
    var ut = userTroupes[i];
    var userId = ut.userId;
    if (!u[userId]) {
      u[userId] = true;
      userIds.push(userId);
    }
    var troupeId = ut.troupeId;
    if (!t[troupeId]) {
      t[troupeId] = true;
      troupeIds.push(troupeId);
    }
  }

  return result;
}

// Callback(err);
function disassociateSocketAndDeactivateUserAndTroupe(socketId, userId, callback) {
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);

  if (!userId) {
    return redisClient
      .presenceDisassociateAnon(
        keySocketUser(socketId),
        ACTIVE_SOCKETS_KEY,
        keyUserSockets('anon'),
        socketId
      )
      .nodeify(callback);
  }

  return lookupTroupeIdForSocket(socketId)
    .then(function(troupeId) {
      return redisClient
        .presenceDisassociate(
          /* keys */ keySocketUser(socketId),
          ACTIVE_USERS_KEY,
          MOBILE_USERS_KEY,
          ACTIVE_SOCKETS_KEY,
          keyUserLock(userId),
          troupeId ? keyTroupeUsers(troupeId) : null,
          keyUserSockets(userId),
          /* values */ userId,
          socketId
        )
        .spread(function(
          deleteSuccess,
          userSocketCountString,
          sremResult,
          userInTroupeCountString,
          totalUsersInTroupe
        ) {
          if (!deleteSuccess) {
            debug(
              'disassociateSocketAndDeactivateUserAndTroupe rejected. Socket already deleted. socketId=%s userId=%s',
              socketId,
              userId
            );
            throw new StatusError(404, 'socket not found');
          }

          var userSocketCount = parseInt(userSocketCountString, 10);

          var userInTroupeCount = parseInt(userInTroupeCountString, 10); // If the user was already eboff, this will be -1

          if (sremResult !== 1 && sremResult !== '1') {
            logger.warn(
              'presence: Socket has already been removed from active sockets. Something fishy is happening.'
            );
          }

          if (userSocketCount === 0) {
            presenceService.emit('userOffline', userId);
          }

          sendAppEventsForUserEyeballsOffTroupe(
            userInTroupeCount,
            totalUsersInTroupe,
            userId,
            troupeId,
            socketId
          );
        });
    })
    .nodeify(callback);
}

function sendAppEventsForUserEyeballsOffTroupe(
  userInTroupeCount,
  totalUsersInTroupe,
  userId,
  troupeId,
  socketId
) {
  if (totalUsersInTroupe === 0 && userInTroupeCount > 0) {
    logger.warn('presence: Troupe is empty, yet user has not left troupe. Something is fishy.', {
      troupeId: troupeId,
      socketId: socketId,
      userId: userId,
      userInTroupeCount: userInTroupeCount,
      totalUsersInTroupe: totalUsersInTroupe
    });
  }

  /* If userInTroupeCount is -1, eyeballs were already off */
  if (userInTroupeCount === 0) {
    presenceService.emit('presenceChange', userId, troupeId, false);
  } else {
    /* If totalUsersInTroupe is -1, eyeballs were already off */
    if (totalUsersInTroupe !== -1) {
      presenceService.emit('presenceChange', userId, troupeId, false);
    }
  }

  if (userId) {
    presenceService.emit('eyeballSignal', userId, troupeId, false);
  }

  // No need to worry about emitting an event if totalUsersInTroupe === 0.
  // Nothing uses it
}

function userSocketConnected(
  userId,
  socketId,
  connectionType,
  clientType,
  realtimeLibrary,
  troupeId,
  oauthClientId,
  token,
  uniqueClientId,
  eyeballState,
  callback
) {
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);

  var isMobileConnection = connectionType === 'mobile';

  if (!userId) {
    return redisClient
      .presenceAssociateAnon(
        /* keys */ keySocketUser(socketId),
        ACTIVE_SOCKETS_KEY,
        keyUserSockets('anon'),
        /* values */ socketId,
        Date.now(),
        isMobileConnection ? 1 : 0,
        clientType,
        realtimeLibrary,
        troupeId || null,
        oauthClientId,
        token,
        uniqueClientId
      )
      .spread(function(lockSuccess, saddResult) {
        if (!lockSuccess) {
          debug(
            'associateSocketAndActivateUser rejected. Socket already exists.',
            socketId,
            userId
          );
          throw new StatusError(409, 'Conflict');
        }

        if (saddResult !== 1 && saddResult !== '1') {
          logger.warn(
            'presence: Socket has already been added to active sockets. Something fishy is happening.'
          );
        }
        return 0;
      })
      .nodeify(callback);
  }

  return redisClient
    .presenceAssociate(
      /* keys */ keySocketUser(socketId),
      ACTIVE_USERS_KEY,
      MOBILE_USERS_KEY,
      ACTIVE_SOCKETS_KEY,
      keyUserLock(userId),
      keyUserSockets(userId),
      /* values */ userId,
      socketId,
      Date.now(),
      isMobileConnection ? 1 : 0,
      clientType,
      realtimeLibrary,
      troupeId || null,
      oauthClientId,
      token,
      uniqueClientId
    )
    .spread(function(lockSuccess, userSocketCountString, saddResult) {
      if (!lockSuccess) {
        debug(
          'presence: associateSocketAndActivateUser rejected. Socket already exists.',
          socketId,
          userId
        );
        throw new StatusError(409, 'socket already exists');
      }

      var userSocketCount = parseInt(userSocketCountString, 10);

      if (saddResult !== 1 && saddResult !== '1') {
        logger.warn(
          'presence: Socket has already been added to active sockets. Something fishy is happening.'
        );
      }

      if (userSocketCount === 1) {
        presenceService.emit('userOnline', userId);
      }

      if (troupeId && eyeballState && userId) {
        return eyeBallsOnTroupe(userId, socketId, troupeId)
          .catch(function(err) {
            logger.error('Unable to signal eyeballs on: ' + err, {
              userId: userId,
              socketId: socketId,
              exception: err
            });
          })
          .thenReturn(userSocketCount);
      }

      return userSocketCount;
    })
    .nodeify(callback);
}

function socketReassociated(socketId, userId, troupeId, eyeballsOn) {
  return lookupSocketOwnerAndTroupe(socketId).spread(function(userId2, previousTroupeId) {
    if (userId !== userId2) {
      logger.warn(
        'User ' +
          userId +
          ' attempted to eyeball socket ' +
          socketId +
          ' but that socket belongs to ' +
          userId2
      );
      var err2 = new StatusError(400, 'Invalid socket for user');
      err2.invalidSocketId = true;
      throw err2;
    }

    if (previousTroupeId === troupeId) {
      // No change... process eyeballs and be done
    }

    return redisClient
      .presenceReassociate(
        /* keys */ keySocketUser(socketId),
        keyUserLock(userId),
        troupeId ? keyTroupeUsers(troupeId) : null,
        previousTroupeId ? keyTroupeUsers(previousTroupeId) : null,
        /* values */ userId,
        socketId,
        troupeId || null,
        previousTroupeId || null,
        userId ? eyeballsOn : false
      ) // Only non-anonymous users can be eyeballs on
      .spread(function(success, newTroupeUserCount, previousTroupeUserCount) {
        if (!success) {
          throw new StatusError(500, 'Socket reassociation failed.');
        }

        previousTroupeUserCount = parseInt(previousTroupeUserCount, 10);
        newTroupeUserCount = parseInt(newTroupeUserCount, 10);

        /* previousTroupeUserCount = -1 if nothing happened, 0..n are the user score */
        if (previousTroupeUserCount === 0) {
          presenceService.emit('presenceChange', userId, previousTroupeId, false);
        }

        if (userId) {
          presenceService.emit('eyeballSignal', userId, previousTroupeId, false);
        }

        if (newTroupeUserCount === 1) {
          presenceService.emit('presenceChange', userId, troupeId, true);
        }

        if (userId) {
          presenceService.emit('eyeballSignal', userId, troupeId, eyeballsOn);
        }
      });
  });
}

function socketDisconnectionRequested(userId, socketId, callback) {
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);
  if (!userId) userId = null;

  return lookupUserIdForSocket(socketId)
    .spread(function(userId2, exists) {
      if (!exists) {
        throw new StatusError(404, 'Socket not found');
      }

      if (!userId2) userId2 = null;

      if (userId !== userId2) {
        throw new StatusError(401, 'userId did not match userId for socket');
      }

      return disassociateSocketAndDeactivateUserAndTroupe(socketId, userId);
    })
    .nodeify(callback);
}

function socketDisconnected(socketId, callback) {
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);

  return lookupUserIdForSocket(socketId)
    .spread(function(userId, exists) {
      if (!exists) return;
      return disassociateSocketAndDeactivateUserAndTroupe(socketId, userId);
    })
    .nodeify(callback);
}

function socketGarbageCollected(socketId, callback) {
  return socketDisconnected(socketId).nodeify(callback);
}

function eyeBallsOnTroupe(userId, socketId, troupeId, callback) {
  if (!userId) return Promise.reject(new StatusError(400, 'userId expected')).nodeify(callback);
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);
  if (!troupeId) return Promise.reject(new StatusError(400, 'troupeId expected')).nodeify(callback);

  return redisClient
    .presenceEyeballsOn(
      /* keys */ keySocketUser(socketId),
      keyTroupeUsers(troupeId),
      keyUserLock(userId),
      /* values */ userId
    )
    .spread(function(eyeballLock, userScoreString) {
      if (!eyeballLock) {
        // Eyeballs is already on, silently ignore
        return;
      }

      var userScore = parseInt(userScoreString, 10); // Score for user is returned as a string
      if (userScore === 1) {
        presenceService.emit('presenceChange', userId, troupeId, true);
      }

      presenceService.emit('eyeballSignal', userId, troupeId, true);
    })
    .nodeify(callback);
}

function eyeBallsOffTroupe(userId, socketId, troupeId, callback) {
  if (!userId) return Promise.reject(new StatusError(400, 'userId expected')).nodeify(callback);
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);
  if (!troupeId) return Promise.reject(new StatusError(400, 'troupeId expected')).nodeify(callback);

  return redisClient
    .presenceEyeballsOff(
      /* keys */ keySocketUser(socketId),
      keyTroupeUsers(troupeId),
      keyUserLock(userId),
      /* values */ userId
    )
    .spread(function(eyeballLock, userInTroupeCountString, totalUsersInTroupe) {
      if (!eyeballLock) {
        // Eyeballs is already off, silently ignore
        return;
      }

      var userInTroupeCount = parseInt(userInTroupeCountString, 10);
      sendAppEventsForUserEyeballsOffTroupe(
        userInTroupeCount,
        totalUsersInTroupe,
        userId,
        troupeId,
        socketId
      );
    });
}

// Return user and troupe for a given socket
function lookupSocketOwnerAndTroupe(socketId) {
  return redisClient.hmget(keySocketUser(socketId), 'uid', 'tid');
}

/**
 * Callback -> (err, userId, exists)
 */
function lookupUserIdForSocket(socketId, callback) {
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);

  return redisClient
    .hmget(keySocketUser(socketId), 'uid', 'ctime')
    .spread(function(userId, exists) {
      return [userId, !!exists];
    })
    .nodeify(callback, { spread: true });
}

function socketExists(socketId, callback) {
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);

  return redisClient
    .hget(keySocketUser(socketId), 'ctime')
    .then(function(reply) {
      return !!reply;
    })
    .nodeify(callback);
}

function lookupTroupeIdForSocket(socketId, callback) {
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);

  return redisClient.hget(keySocketUser(socketId), 'tid').nodeify(callback);
}

function findOnlineUsersForTroupe(troupeId, callback) {
  if (!troupeId) return Promise.reject(new StatusError(400, 'troupeId expected')).nodeify(callback);

  return redisClient.zrangebyscore(keyTroupeUsers(troupeId), 1, '+inf').nodeify(callback);
}

// Given an array of usersIds, returns a hash with the status of each user. If the user is no in the hash
// it implies that they're offline
// callback(err, status)
// with status[userId] = 'online' / <missing>
function categorizeUsersByOnlineStatus(userIds, callback) {
  if (!userIds || userIds.length === 0) return Promise.resolve({}).nodeify(callback);

  var time = process.hrtime();
  var seconds = time[0];
  var nanoseconds = time[1];
  var key_working_set = 'presence_temp_set:' + process.pid + ':' + seconds + ':' + nanoseconds;
  var key_working_output_set = key_working_set + '_out';

  // TODO: switch this out for a pipeline command to make it lock less
  return redisClient
    .presenceCategorizeUsers(
      key_working_set,
      key_working_output_set,
      ACTIVE_USERS_KEY,
      MOBILE_USERS_KEY,
      userIds
    )
    .spread(function(onlineUsers, mobileUsers) {
      var result = {};

      if (mobileUsers) {
        _.each(mobileUsers, function(userId) {
          result[userId] = 'mobile';
        });
      }

      if (onlineUsers) {
        _.each(onlineUsers, function(userId) {
          result[userId] = 'online';
        });
      }

      return result;
    })
    .nodeify(callback);
}

function categorizeUserTroupesByOnlineStatus(userTroupes, callback) {
  debug('categorizeUserTroupesByOnlineStatus for %s items', userTroupes.length);

  // Previously this was using _.uniq and taking 300ms in large rooms,
  // this is much, much, much faster
  var uniqueUsersAndTroupes = getUniqueUsersAndTroupes(userTroupes);
  var userIds = uniqueUsersAndTroupes[0];
  var troupeIds = uniqueUsersAndTroupes[1];

  debug(
    'categorizeUserTroupesByOnlineStatus unique troupes=%s unique users=%s',
    troupeIds.length,
    userIds.length
  );

  return Promise.all([listOnlineUsersForTroupes(troupeIds), categorizeUsersByOnlineStatus(userIds)])
    .spread(function(troupeOnlineUsers, statii) {
      var inTroupe = [];
      var online = [];
      var offline = [];

      userTroupes.forEach(function(userTroupe) {
        var userId = userTroupe.userId;
        var troupeId = userTroupe.troupeId;

        var onlineForTroupe = troupeOnlineUsers[troupeId];
        if (onlineForTroupe.indexOf(userId) >= 0) {
          inTroupe.push(userTroupe);
        } else if (statii[userId] === 'online') {
          online.push(userTroupe);
        } else {
          offline.push(userTroupe);
        }
      });

      return {
        inTroupe: inTroupe,
        online: online,
        offline: offline
      };
    })
    .nodeify(callback);
}

function checkMultiErrors(replies) {
  if (replies) {
    replies.forEach(function(reply) {
      var err = reply[0];
      if (err) throw err;
    });
  }

  return replies;
}

function isUserConnectedWithClientType(userId, clientType, callback) {
  return listAllSocketsForUser(userId)
    .then(function(socketIds) {
      if (!socketIds || !socketIds.length) return false;

      var multi = redisClient.multi();
      socketIds.forEach(function(socketId) {
        multi.hmget(keySocketUser(socketId), 'ct');
      });

      return multi
        .exec()
        .then(checkMultiErrors)
        .then(function(replies) {
          var clientTypeBeta = clientType + 'beta';

          for (var i = 0; i < replies.length; i++) {
            var ct = replies[i][1][0];
            if (ct === clientType || ct === clientTypeBeta) return true;
          }

          return false;
        });
    })
    .nodeify(callback);
}

function listAllSocketsForUser(userId, callback) {
  return redisClient.smembers(keyUserSockets(userId)).nodeify(callback);
}

function listOnlineUsers(callback) {
  return redisClient.zrange(ACTIVE_USERS_KEY, 0, -1).nodeify(callback);
}

function listMobileUsers(callback) {
  return redisClient.zrange(MOBILE_USERS_KEY, 0, -1).nodeify(callback);
}

function getSocket(socketId, callback) {
  return redisClient
    .hmget(
      keySocketUser(socketId),
      'uid',
      'tid',
      'eb',
      'mob',
      'ctime',
      'ct',
      'rl',
      'ocid',
      'tok',
      'ucid'
    )
    .spread(function(
      userId,
      troupeId,
      eyeballs,
      mobile,
      createdTimeString,
      clientType,
      realtimeLibrary,
      oauthClientId,
      token,
      uniqueClientId
    ) {
      if (!createdTimeString) return;

      return {
        userId: userId,
        troupeId: troupeId || null,
        eyeballs: !!eyeballs,
        mobile: !!mobile,
        createdTime: new Date(parseInt(createdTimeString, 10)),
        clientType: clientType,
        realtimeLibrary: realtimeLibrary,
        oauthClientId: oauthClientId,
        token,
        uniqueClientId: uniqueClientId
      };
    })
    .nodeify(callback);
}

function getSockets(socketIds, callback) {
  var multi = redisClient.multi();
  socketIds.forEach(function(socketId) {
    multi.hmget(
      keySocketUser(socketId),
      'uid',
      'tid',
      'eb',
      'mob',
      'ctime',
      'ct',
      'rl',
      'ocid',
      'tok',
      'ucid'
    );
  });

  return multi
    .exec()
    .then(checkMultiErrors)
    .then(function(results) {
      var hash = results.reduce(function(hash, resultResponse, index) {
        var result = resultResponse[1];

        var socketId = socketIds[index];
        if (!result[4]) {
          hash[socketId] = null;
          return hash;
        }

        hash[socketId] = {
          userId: result[0],
          troupeId: result[1],
          eyeballs: !!result[2],
          mobile: !!result[3],
          createdTime: new Date(parseInt(result[4], 10)),
          clientType: result[5],
          realtimeLibrary: result[6],
          oauthClientId: result[7],
          token: result[8],
          uniqueClientId: result[9]
        };

        return hash;
      }, {});

      return hash;
    })
    .nodeify(callback);
}

function listActiveSockets(callback) {
  // This can't be done in a lua script as we don't know the keys in advance
  return redisClient
    .smembers(ACTIVE_SOCKETS_KEY)
    .then(function(socketIds) {
      if (socketIds.length === 0) return [];

      var multi = redisClient.multi();
      socketIds.forEach(function(socketId) {
        multi.hmget(keySocketUser(socketId), 'uid', 'tid', 'eb', 'mob', 'ctime', 'ct');
      });

      return multi
        .exec()
        .then(checkMultiErrors)
        .then(function(replies) {
          var result = replies.map(function(replyPair, index) {
            var reply = replyPair[1];

            return {
              id: socketIds[index],
              userId: reply[0],
              troupeId: reply[1],
              eyeballs: !!reply[2],
              mobile: !!reply[3],
              createdTime: parseInt(reply[4], 10),
              client: reply[5]
            };
          });

          return result;
        });
    })
    .nodeify(callback);
}

// Returns the online users for the given troupes
// The callback function returns a hash
// result[troupeId] = [userIds]
function listOnlineUsersForTroupes(troupeIds, callback) {
  if (!troupeIds || troupeIds.length === 0) return Promise.resolve({}).nodeify(callback);

  troupeIds = uniqueIds(troupeIds);

  var multi = redisClient.multi();

  troupeIds.forEach(function(troupeId) {
    multi.zrangebyscore(keyTroupeUsers(troupeId), 1, '+inf');
  });

  return multi
    .exec()
    .then(checkMultiErrors)
    .then(function(replies) {
      var result = {};
      troupeIds.forEach(function(troupeId, index) {
        var replyPair = replies[index];

        var onlineUsers = replyPair[1];
        result[troupeId] = onlineUsers;
      });

      return result;
    })
    .nodeify(callback);
}

function clientEyeballSignal(userId, socketId, eyeballsOn, callback) {
  if (!userId) return Promise.reject(new StatusError(400, 'userId expected')).nodeify(callback);
  if (!socketId) return Promise.reject(new StatusError(400, 'socketId expected')).nodeify(callback);

  return lookupSocketOwnerAndTroupe(socketId)
    .spread(function(userId2, troupeId) {
      if (userId !== userId2) {
        logger.warn(
          'User ' +
            userId +
            ' attempted to eyeball socket ' +
            socketId +
            ' but that socket belongs to ' +
            userId2
        );
        var err2 = new StatusError(400, 'Invalid socket for user');
        err2.invalidSocketId = true;
        throw err2;
      }

      if (!troupeId) throw new StatusError(409, 'Socket is not associated with a troupe');

      if (eyeballsOn) {
        debug('Eyeballs on: user %s troupe %s', userId, troupeId);
        return eyeBallsOnTroupe(userId, socketId, troupeId);
      } else {
        debug('Eyeballs off: user %s troupe %s', userId, troupeId);
        return eyeBallsOffTroupe(userId, socketId, troupeId);
      }
    })
    .nodeify(callback);
}

function collectGarbage(bayeux, callback) {
  var start = Date.now();

  return validateActiveSockets(bayeux)
    .then(function(invalidSocketCount) {
      var total = Date.now() - start;

      if (invalidSocketCount) {
        logger.warn(
          'Presence GC took ' + total + 'ms and cleared out ' + invalidSocketCount + ' sockets'
        );
      } else {
        debug('Presence GC took %sms and cleared out no invalid sockets', total);
      }

      return invalidSocketCount;
    })
    .nodeify(callback);
}

function validateActiveSockets(bayeux, callback) {
  return redisClient
    .smembers(ACTIVE_SOCKETS_KEY)
    .then(function(sockets) {
      debug('Validation: %s active sockets.', sockets.length);
      if (!sockets.length) {
        return 0;
      }

      var invalidCount = 0;

      debug('Validating %s active sockets', sockets.length);
      return Promise.map(
        sockets,
        function(socketId) {
          debug('Validation: validating socker %s', socketId);

          return Promise.fromNode(function(callback) {
            bayeux.clientExists(socketId, function(exists) {
              // Beware: bayeux is not a standard node callback. No err!
              return callback(null, exists);
            });
          }).then(function(exists) {
            if (exists) return; /* All good */

            invalidCount++;
            debug('Disconnecting invalid socket %s', socketId);

            return socketGarbageCollected(socketId).catch(function(err) {
              logger.info('Failure while gc-ing invalid socket', {
                exception: err,
                socketId: socketId
              });
            });
          });
        },
        { concurrency: 5 }
      ).then(function() {
        return invalidCount;
      });
    })
    .nodeify(callback);
}

function hashZset(scoresArray) {
  var hash = {};
  for (var i = 0; i < scoresArray.length; i = i + 2) {
    hash[scoresArray[i]] = parseInt(scoresArray[i + 1], 10);
  }
  return hash;
}

function validateUsersSubset(userIds, callback) {
  debug('Validating %s users ', userIds.length);

  // Use a new client due to the WATCH semantics (don't use getClient!)
  var redisWatchClient = createClient();
  return redisWatchClient
    .watch(userIds.map(keyUserLock))
    .then(function() {
      if (presenceService.testOnly.forceDelay) {
        return Promise.delay(120)
          .then(function() {
            if (presenceService.testOnly.onAfterDelay) {
              return presenceService.testOnly.onAfterDelay();
            }
          })
          .then(function() {
            return listActiveSockets();
          });
      }

      /* No testing delay */
      return listActiveSockets();
    })
    .then(function(sockets) {
      var onlineCounts = {};
      var mobileCounts = {};
      var troupeCounts = {};
      var troupeIdsHash = {};

      // This can't be done in the script manager
      // as that is using a different redis connection
      // and besides we don't know the semantics of WATCH
      // in Lua :)

      sockets.forEach(function(socket) {
        var userId = socket.userId;
        var troupeId = socket.troupeId;

        if (userIds.indexOf(userId) >= 0) {
          if (troupeId) {
            troupeIdsHash[troupeId] = true;
            if (socket.eyeballs) {
              if (troupeCounts[userId]) {
                troupeCounts[userId][troupeId] = troupeCounts[userId][troupeId]
                  ? troupeCounts[userId][troupeId] + 1
                  : 1;
              } else {
                troupeCounts[userId] = { troupeId: 1 };
              }
            }
          }

          if (socket.mobile) {
            mobileCounts[userId] = mobileCounts[userId] ? mobileCounts[userId] + 1 : 1;
          } else {
            onlineCounts[userId] = onlineCounts[userId] ? onlineCounts[userId] + 1 : 1;
          }
        }
      });

      var troupeIds = Object.keys(troupeIdsHash);

      return Promise.all(
        [
          redisWatchClient.zrangebyscore(ACTIVE_USERS_KEY, 1, '+inf', 'WITHSCORES'),
          redisWatchClient.zrangebyscore(MOBILE_USERS_KEY, 1, '+inf', 'WITHSCORES')
        ].concat(
          troupeIds.map(function(troupeId) {
            return redisWatchClient.zrangebyscore(
              keyTroupeUsers(troupeId),
              1,
              '+inf',
              'WITHSCORES'
            );
          })
        )
      ).then(function(results) {
        var needsUpdate = false;
        var multi = redisWatchClient.multi();

        var currentActiveUserHash = hashZset(results[0]);
        var currentMobileUserHash = hashZset(results[1]);

        userIds.forEach(function(userId) {
          var currentActiveScore = currentActiveUserHash[userId] || 0;
          var currentMobileScore = currentMobileUserHash[userId] || 0;

          var calculatedActiveScore = onlineCounts[userId] || 0;
          var calculatedMobileScore = mobileCounts[userId] || 0;

          if (calculatedActiveScore !== currentActiveScore) {
            logger.info(
              'Inconsistency in active score in presence service for user ' +
                userId +
                '. ' +
                calculatedActiveScore +
                ' vs ' +
                currentActiveScore
            );

            needsUpdate = true;
            multi.zrem(ACTIVE_USERS_KEY, userId);
            if (calculatedActiveScore > 0) {
              multi.zincrby(ACTIVE_USERS_KEY, calculatedActiveScore, userId);
            }
          }

          if (calculatedMobileScore !== currentMobileScore) {
            logger.info(
              'Inconsistency in mobile score in presence service for user ' +
                userId +
                '. ' +
                currentMobileScore +
                ' vs ' +
                calculatedMobileScore
            );

            needsUpdate = true;
            multi.zrem(MOBILE_USERS_KEY, userId);
            if (calculatedActiveScore > 0) {
              multi.zincrby(MOBILE_USERS_KEY, calculatedMobileScore, userId);
            }
          }
        });

        // Now check each troupeId for each userId
        troupeIds.forEach(function(troupeId, index) {
          var userTroupeScores = hashZset(results[2 + index]);

          userIds.forEach(function(userId) {
            var currentTroupeScore = userTroupeScores[userId] || 0;

            var calculatedTroupeScore =
              (troupeCounts[userId] && troupeCounts[userId][troupeId]) || 0;

            if (calculatedTroupeScore !== currentTroupeScore) {
              logger.info(
                'Inconsistency in troupe score in presence service for user ' +
                  userId +
                  ' in troupe ' +
                  troupeId +
                  '. ' +
                  calculatedTroupeScore +
                  ' vs ' +
                  currentTroupeScore
              );

              needsUpdate = true;
              var key = keyTroupeUsers(troupeId);
              multi.zrem(key, userId);
              if (calculatedTroupeScore > 0) {
                multi.zincrby(key, calculatedTroupeScore, userId);
              }
            }
          });
        });

        // Nothing to do? Finish
        if (!needsUpdate) return;

        return multi
          .exec()
          .then(checkMultiErrors)
          .then(function(replies) {
            if (!replies) {
              var err = new StatusError(419, 'Transaction rolled back');
              err.rollback = true;
              throw err;
            }
          });
      });
    })
    .finally(function() {
      env.ioredis.quitClient(redisWatchClient);
    })
    .nodeify(callback);
}

function validateUsers(callback) {
  var start = Date.now();

  return listOnlineUsers()
    .then(function(userIds) {
      logger.info('presence:validate:online user count is ' + userIds.length);

      if (userIds.length === 0) return;

      function recurseUserIds() {
        logger.info(
          'presence:validate:validating next batch: ' + userIds.length + ' users remaining.'
        );
        if (!userIds.length) {
          var total = Date.now() - start;
          logger.info('Presence.validateUsers GC took ' + total + 'ms');
          return;
        }

        var subset = userIds.splice(0, 100);
        return validateUsersSubset(subset)
          .catch(function(err) {
            if (err.rollback) return;

            throw err;
          })
          .then(recurseUserIds);
      }

      return recurseUserIds();
    })
    .nodeify(callback);
}

// Connections and disconnections
presenceService.userSocketConnected = userSocketConnected;
presenceService.socketDisconnected = socketDisconnected;
presenceService.socketDisconnectionRequested = socketDisconnectionRequested;
presenceService.socketReassociated = socketReassociated;

// Query Status
presenceService.lookupUserIdForSocket = lookupUserIdForSocket;
presenceService.socketExists = socketExists;
presenceService.findOnlineUsersForTroupe = findOnlineUsersForTroupe;
presenceService.categorizeUsersByOnlineStatus = categorizeUsersByOnlineStatus;
presenceService.listOnlineUsers = listOnlineUsers;
presenceService.listActiveSockets = listActiveSockets;
presenceService.getSocket = getSocket;
presenceService.getSockets = getSockets;
presenceService.listMobileUsers = listMobileUsers;
presenceService.listOnlineUsersForTroupes = listOnlineUsersForTroupes;
presenceService.categorizeUserTroupesByOnlineStatus = categorizeUserTroupesByOnlineStatus;
presenceService.listAllSocketsForUser = listAllSocketsForUser;
presenceService.isUserConnectedWithClientType = isUserConnectedWithClientType;

// Eyeball
presenceService.clientEyeballSignal = clientEyeballSignal;

// GC
presenceService.collectGarbage = collectGarbage;
presenceService.validateUsers = validateUsers;

// -------------------------------------------------------------------
// Default Events
// -------------------------------------------------------------------

if (debug.enabled) {
  presenceService.on('userOnline', function(userId) {
    debug('User %s connected.', userId);
  });

  presenceService.on('userOffline', function(userId) {
    debug('User %s disconnected.', userId);
  });

  presenceService.on('presenceChange', function(userId, troupeId, presence) {
    debug('User %s presence in room %s: %s', userId, troupeId, presence);
  });
}

presenceService.testOnly = {
  ACTIVE_USERS_KEY: ACTIVE_USERS_KEY,
  validateUsersSubset: validateUsersSubset,
  forceDelay: false,
  redisClient: redisClient
};

module.exports = presenceService;
