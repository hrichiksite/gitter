'use strict';

// Lets get rid of hamcrest. Until we do, we'll have to do this
// its nasty, but if jsmockito uses a different instance of the library
// it won't work correctly
function getHamcrest() {
  try {
    return require('jshamcrest').JsHamcrest;
  } catch (e) {
    /* do nothing */
  }

  try {
    return require('jsmockito/node_modules/jshamcrest').JsHamcrest; // eslint-disable-line
  } catch (e) {
    /* do nothing */
  }

  var hamcrest = require('jsmockito').JsHamcrest;
  if (!hamcrest) {
    throw new Error('Unable to obtain hamcrest instance');
  }

  return hamcrest;
}

var assert = require('assert');
var presenceService = require('..');
var mockito = require('jsmockito').JsMockito;
var never = mockito.Verifiers.never;
var hamcrest = getHamcrest();
var anything = hamcrest.Matchers.anything;
var Promise = require('bluebird');

var fakeEngine = {
  clientExists: function(clientId, callback) {
    callback(!clientId.match(/^TEST/));
  }
};

describe('presenceService', function() {
  function cleanup() {
    return presenceService.collectGarbage(fakeEngine).then(function() {
      return presenceService.validateUsers();
    });
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should cleanup invalid sockets correctly', function() {
    return presenceService.listOnlineUsers().then(function(users) {
      var noTestUsersOnline =
        users.length === 0 ||
        users.every(function(id) {
          return !id.match(/^TEST/);
        });

      assert(
        noTestUsersOnline,
        'Garbage collection does not seem to have run correctly ' + users.join(', ')
      );
    });
  });

  it('should allow a user to connect', function() {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    return presenceService.userSocketConnected(
      userId,
      socketId,
      'online',
      'test',
      'faye',
      null, // troupeId
      null, // oauthClientId
      null, // token
      null, // uniqueClientId
      null // eyeballState
    );
  });

  it('should allow a user to connect and then disconnect', function() {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'online',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        return presenceService.socketDisconnected(socketId);
      });
  });

  it('users presence should appear and disappear as expected', function() {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    var troupeId = 'TESTTROUPE1' + Date.now();

    // Make sure things are clean
    return presenceService.findOnlineUsersForTroupe(troupeId).then(function(users) {
      // User should not exist
      assert(
        users.length === 0 ||
          users.every(function(id) {
            return id !== userId;
          }),
        'Expected user _not_ to be online at beginning of test: ',
        users.join(', ')
      );

      // Connect the socket
      return presenceService
        .userSocketConnected(
          userId,
          socketId,
          'online',
          'test',
          'faye',
          troupeId,
          null, // oauthClientId
          null, // token
          null, // uniqueClientId
          true
        )
        .then(function() {
          // Check that the lookup code is working as expected
          return presenceService
            .lookupUserIdForSocket(socketId)
            .spread(function(returnedUserId, exists) {
              assert.strictEqual(returnedUserId, userId);
              assert.strictEqual(exists, true);

              // Make sure that the user appears online
              return presenceService.findOnlineUsersForTroupe(troupeId).then(function(users) {
                assert(
                  users.some(function(id) {
                    return id === userId;
                  }),
                  'Expected user to be online'
                );

                // Disconnect the socket
                return presenceService.socketDisconnected(socketId).then(function() {
                  // Check if the user is still in the troupe
                  return presenceService.findOnlineUsersForTroupe(troupeId).then(function(users) {
                    var notThere =
                      !users.length ||
                      users.every(function(id) {
                        return id !== userId;
                      });

                    assert(
                      notThere,
                      'Expect user to be offline: online users are: ' + users.join(', ')
                    );
                  });
                });
              });
            });
        });
    });
  });

  it('users presence should remain offline if they subscribe to a troupe while offline', function() {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    var troupeId = 'TESTTROUPE1' + Date.now();

    // Make sure things are clean
    return presenceService
      .findOnlineUsersForTroupe(troupeId)
      .then(function(users) {
        // User should not exist
        assert(
          users.length === 0 ||
            users.every(function(id) {
              return id !== userId;
            }),
          'Expected user _not_ to be online at beginning of test: ',
          users.join(', ')
        );

        // Connect the socket
        return presenceService.userSocketConnected(
          userId,
          socketId,
          'online',
          'test',
          'faye',
          troupeId,
          null, // oauthClientId
          null, // token
          null, // uniqueClientId
          false
        );
      })
      .then(function() {
        // Make sure that the user appears online
        return presenceService.findOnlineUsersForTroupe(troupeId);
      })
      .then(function(users) {
        assert(users.indexOf(userId) === -1, 'Expected user to be offline');

        return presenceService.clientEyeballSignal(userId, socketId, 1);
      })
      .then(function() {
        // Make sure that the user appears online
        return presenceService.findOnlineUsersForTroupe(troupeId);
      })
      .then(function(users) {
        assert(users.indexOf(userId) !== -1, 'Expected user to be online');
      });
  });

  it('should handle very quick connect/disconnect cycles when the user connects to a troupe', function() {
    var userId = 'TESTUSER2' + Date.now();
    var socketId = 'TESTSOCKET2' + Date.now();
    var troupeId = 'TESTTROUPE2' + Date.now();

    // This simulates three events happening in very quick succession
    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'online',
        'test',
        'faye',
        troupeId,
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        true
      )
      .then(function() {
        return presenceService.socketDisconnected(socketId);
      })
      .then(function() {
        return presenceService.categorizeUsersByOnlineStatus([userId]);
      })
      .then(function(statii) {
        assert(!statii[userId]);

        return presenceService.listOnlineUsersForTroupes([troupeId]);
      })
      .then(function(troupeOnlineUsers) {
        assert(troupeOnlineUsers[troupeId].length === 0);
      });
  });

  it('should handle eye-balls-on, eyes-balls-off', function() {
    var userId = 'TESTUSER3' + Date.now();
    var socketId = 'TESTSOCKET3' + Date.now();
    var troupeId = 'TESTTROUPE3' + Date.now();

    function assertUserTroupeStatus(inTroupe) {
      // Make sure that the user appears online
      return presenceService.findOnlineUsersForTroupe(troupeId).then(function(users) {
        if (inTroupe) {
          assert(
            users.some(function(id) {
              return id === userId;
            }),
            'Expected user to be online'
          );
        } else {
          assert(
            users.every(function(id) {
              return id !== userId;
            }),
            'Expected user not to be online (OFFLINE)'
          );
        }
      });
    }

    // To start off, the user should not be in the troupe
    return assertUserTroupeStatus(false)
      .then(function() {
        // Connect socket
        return presenceService.userSocketConnected(
          userId,
          socketId,
          'online',
          'test',
          'faye',
          troupeId,
          null, // oauthClientId
          null, // token
          null, // uniqueClientId
          true
        );
      })
      .then(function() {
        // Now the user should be online
        return assertUserTroupeStatus(true);
      })
      .then(function() {
        // Signal user as not focused
        return presenceService.clientEyeballSignal(userId, socketId, 0);
      })
      .then(function() {
        // Should not be in troupe
        return assertUserTroupeStatus(false);
      })
      .then(function() {
        // Signal user as being back in troupe
        return presenceService.clientEyeballSignal(userId, socketId, 1);
      })
      .then(function() {
        // User should be in troupe
        return assertUserTroupeStatus(true);
      })
      .then(function() {
        // Disconnect socket
        return presenceService.socketDisconnected(socketId);
      })
      .then(function() {
        // USer should not be in troupe
        return assertUserTroupeStatus(false);
      });
  });

  it('should handle incorrect eyeball signals', function() {
    function assertUserTroupeStatus(inTroupe) {
      // Make sure that the user appears online
      return presenceService.findOnlineUsersForTroupe(troupeId).then(function(users) {
        if (inTroupe) {
          assert(
            users.some(function(id) {
              return id === userId;
            }),
            'Expected user to be online'
          );
        } else {
          assert(
            users.every(function(id) {
              return id !== userId;
            }),
            'Expected user not to be online (OFFLINE)'
          );
        }
      });
    }

    var userId = 'TESTUSER4' + Date.now();
    var socketId = 'TESTSOCKET4' + Date.now();
    var troupeId = 'TESTTROUPE4' + Date.now();

    // Connect socket
    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'online',
        'test',
        'faye',
        troupeId,
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        true
      )
      .then(function() {
        var signals = [1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1];

        function doNext() {
          if (signals.length <= 0) return Promise.resolve();
          var signal = signals.shift();

          return presenceService.clientEyeballSignal(userId, socketId, signal).then(function() {
            return assertUserTroupeStatus(signal).then(function() {
              return doNext();
            });
          });
        }

        return doNext();
      });
  });

  it('should garbage collect invalid sockets', function() {
    var userId = 'TESTUSER4' + Date.now();
    var socketId = 'TESTSOCKET4' + Date.now();

    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'online',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        return presenceService.collectGarbage(fakeEngine);
      })
      .then(function(count) {
        assert(count === 1, 'Expected one invalid socket to be deleted');

        return presenceService.listOnlineUsers();
      })
      .then(function(users) {
        assert(users.indexOf(userId) === -1, 'User should not be online');
      });
  });

  it('should not show mobile users as online', function() {
    var userId = 'TESTUSER4' + Date.now();
    var socketId = 'TESTSOCKET4' + Date.now();

    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'mobile',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        return presenceService.listOnlineUsers();
      })
      .then(function(users) {
        assert(users.indexOf(userId) === -1, 'User should not be online');
      });
  });

  it('should categorise mobile users as mobile', function() {
    var userId = 'TESTUSER5' + Date.now();
    var socketId = 'TESTSOCKET5' + Date.now();

    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'mobile',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        return presenceService.categorizeUsersByOnlineStatus([userId]);
      })
      .then(function(categorised) {
        var expected = {};
        expected[userId] = 'mobile';
        assert.deepEqual(expected, categorised);
      });
  });

  it('should show mobile users in a troupe as in the troupe', function() {
    var userId = 'TESTUSER4' + Date.now();
    var socketId = 'TESTSOCKET4' + Date.now();
    var troupeId = 'TESTTROUPE4' + Date.now();

    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'mobile',
        'test',
        'faye',
        troupeId,
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        true
      )
      .then(function() {
        return presenceService.findOnlineUsersForTroupe(troupeId);
      })
      .then(function(users) {
        assert(
          users.some(function(id) {
            return id === userId;
          }),
          'Expected user to be online'
        );

        return presenceService.clientEyeballSignal(userId, socketId, 0);
      })
      .then(function() {
        return presenceService.findOnlineUsersForTroupe(troupeId);
      })
      .then(function(users) {
        assert(
          users.every(function(id) {
            return id !== userId;
          }),
          'Expected user not to be online (OFFLINE)'
        );
      });
  });

  it('should handle users who are online and mobile concurrently correctly', function() {
    var userId = 'TESTUSER4' + Date.now();
    var socketId1 = 'TESTSOCKET4' + Date.now();
    var socketId2 = 'TESTSOCKET5' + Date.now();
    var troupeId = 'TESTTROUPE4' + Date.now();

    function ensureUserOnlineStatus(online) {
      return presenceService.listOnlineUsers().then(function(users) {
        if (online) {
          assert(
            users.some(function(id) {
              return id === userId;
            }),
            'Expected user to be online'
          );
        } else {
          assert(
            users.every(function(id) {
              return id !== userId;
            }),
            'Expected user not to be online (OFFLINE)'
          );
        }
      });
    }

    function ensureUserTroupeStatus(inTroupe) {
      // Make sure that the user appears online
      return presenceService.findOnlineUsersForTroupe(troupeId).then(function(users) {
        if (inTroupe) {
          assert(
            users.some(function(id) {
              return id === userId;
            }),
            'Expected user to be in the troupe' + users.join(', ')
          );
        } else {
          assert(
            users.every(function(id) {
              return id !== userId;
            }),
            'Expected user not to be in the troupe: ' + users.join(', ')
          );
        }
      });
    }

    return presenceService
      .userSocketConnected(
        userId,
        socketId1,
        'mobile',
        'test',
        'faye',
        troupeId,
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        true
      )
      .then(function() {
        return ensureUserTroupeStatus(true);
      })
      .then(function() {
        return presenceService.userSocketConnected(
          userId,
          socketId2,
          'online',
          'test',
          'faye',
          troupeId,
          null, // oauthClientId
          null, // token TODO
          null, // uniqueClientId
          null // eyeballState
        );
      })
      .then(function() {
        return ensureUserOnlineStatus(true);
      })
      .then(function() {
        return presenceService.clientEyeballSignal(userId, socketId2, 0);
      })
      .then(function() {
        // User is still online, but not in the troupe
        return ensureUserOnlineStatus(true);
      })
      .then(function() {
        // At this moment, the mobile eyeball is still on,
        return ensureUserTroupeStatus(true);
      })
      .then(function() {
        // Turn mobile eyeball off
        return presenceService.clientEyeballSignal(userId, socketId1, 0);
      })
      .then(function() {
        return ensureUserTroupeStatus(false);
      });
  });

  it('should validate sockets', function() {
    return presenceService.validateUsers();
  });

  it('should correct sockets', function() {
    var userId = 'TESTUSER4' + Date.now();
    var socketId = 'TESTSOCKET5' + Date.now();

    var redisClient = presenceService.testOnly.redisClient;
    redisClient = Promise.promisifyAll(redisClient);

    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'online',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token TODO
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        // Now mess things up intentionally
        return redisClient.zincrbyAsync(presenceService.testOnly.ACTIVE_USERS_KEY, 1, userId);
      })
      .then(function() {
        return presenceService.validateUsers();
      })
      .then(function() {
        return presenceService.socketDisconnected(socketId);
      })
      .then(function() {
        return presenceService.listOnlineUsers();
      })
      .then(function(users) {
        assert(
          users.every(function(id) {
            return id !== userId;
          }),
          'Expected user not to be in the troupe: ' + users.join(', ')
        );
      });
  });

  it('should correct sockets for multiple users', function() {
    var userId1 = 'TESTUSER1' + Date.now();
    var userId2 = 'TESTUSER2' + Date.now();
    var socketId1 = 'TESTSOCKET1' + Date.now();
    var socketId2 = 'TESTSOCKET2' + Date.now();

    var redisClient = presenceService.testOnly.redisClient;
    redisClient = Promise.promisifyAll(redisClient);

    return presenceService
      .userSocketConnected(
        userId1,
        socketId1,
        'online',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token TODO
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        return presenceService.userSocketConnected(
          userId2,
          socketId2,
          'mobile',
          'test',
          'faye',
          null, // troupeId
          null, // oauthClientId
          null, // token TODO
          null, // uniqueClientId
          null // eyeballState
        );
      })
      .then(function() {
        // Now mess things up intentionally
        return redisClient.zincrbyAsync(presenceService.testOnly.ACTIVE_USERS_KEY, 1, userId2);
      })
      .then(function() {
        return redisClient.zincrbyAsync(presenceService.testOnly.MOBILE_USERS_KEY, 1, userId1);
      })
      .then(function() {
        return presenceService.validateUsers();
      })
      .then(function() {
        return presenceService.socketDisconnected(socketId1);
      })
      .then(function() {
        return presenceService.socketDisconnected(socketId2);
      })
      .then(function() {
        return presenceService.listOnlineUsers();
      })
      .then(function(users) {
        assert(
          users.every(function(id) {
            return id !== userId1;
          }),
          'Expected user not to be in the troupe: ' + users.join(', ')
        );
        assert(
          users.every(function(id) {
            return id !== userId2;
          }),
          'Expected user not to be in the troupe: ' + users.join(', ')
        );
      });
  });

  it('should abort the transaction when correcting the socket and an event occurs for the user', function() {
    var userId = 'TESTUSER4' + Date.now();
    var socketId = 'TESTSOCKET5' + Date.now();

    var redisClient = presenceService.testOnly.redisClient;
    redisClient = Promise.promisifyAll(redisClient);

    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'online',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token TODO
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        // now mess things up intentionally
        return redisClient.zincrbyAsync(presenceService.testOnly.ACTIVE_USERS_KEY, 1, userId);
      })
      .then(function() {
        presenceService.testOnly.forceDelay = true;
        presenceService.testOnly.onAfterDelay = function() {
          return presenceService.socketDisconnected(socketId);
        };

        return presenceService.testOnly.validateUsersSubset([userId]);
      })
      .then(
        function() {
          assert.ok(false, 'Expected an error');
        },
        function(err) {
          assert(err.rollback, 'Expected a transaction rollback');
        }
      )
      .finally(function() {
        presenceService.testOnly.forceDelay = false;
        presenceService.testOnly.onAfterDelay = null;
      });
  });

  it('should correctly categorize users who are online and offline', function() {
    var userId1 = 'TESTUSER1' + Date.now();
    var socketId1 = 'TESTSOCKET1' + Date.now();
    var userId2 = 'TESTUSER2' + Date.now();
    var socketId2 = 'TESTSOCKET2' + Date.now();

    return presenceService
      .userSocketConnected(
        userId1,
        socketId1,
        'online',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token TODO
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        return presenceService.userSocketConnected(
          userId2,
          socketId2,
          'online',
          'test',
          'faye',
          null, // troupeId
          null, // oauthClientId
          null, // token TODO
          null, // uniqueClientId
          null // eyeballState
        );
      })
      .then(function() {
        return presenceService.categorizeUsersByOnlineStatus([userId1, userId2]);
      })
      .then(function(c) {
        assert.equal(c[userId1], 'online');
        assert.equal(c[userId2], 'online');
      });
  });

  it('should correctly categorize userstroupe who are introupe, online and offline', function() {
    var userId1 = 'TESTUSER1' + Date.now();
    var socketId1 = 'TESTSOCKET1' + Date.now();
    var userId2 = 'TESTUSER2' + Date.now();
    var socketId2 = 'TESTSOCKET2' + Date.now();
    var troupeId = 'TESTTROUPE1' + Date.now();
    var userId3 = 'TESTUSER3' + Date.now();

    return presenceService
      .userSocketConnected(
        userId1,
        socketId1,
        'online',
        'test',
        'faye',
        troupeId,
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        true
      )
      .then(function() {
        return presenceService.userSocketConnected(
          userId2,
          socketId2,
          'online',
          'test',
          'faye',
          null, // troupeId
          null, // oauthClientId
          null, // token
          null, // uniqueClientId
          null // eyeballState
        );
      })
      .then(function() {
        return presenceService.categorizeUserTroupesByOnlineStatus([
          {
            userId: userId1,
            troupeId: troupeId
          },
          {
            userId: userId2,
            troupeId: troupeId
          },
          {
            userId: userId3,
            troupeId: troupeId
          }
        ]);
      })
      .then(function(c) {
        assert.equal(c.inTroupe.length, 1);
        assert.equal(c.inTroupe[0].userId, userId1);
        assert.equal(c.inTroupe[0].troupeId, troupeId);

        assert.equal(c.online.length, 1);
        assert.equal(c.online[0].userId, userId2);
        assert.equal(c.online[0].troupeId, troupeId);

        assert.equal(c.offline.length, 1);
        assert.equal(c.offline[0].userId, userId3);
        assert.equal(c.offline[0].troupeId, troupeId);
      });
  });

  it('user sockets list should be correctly maintained', async () => {
    const userId = 'TESTUSER1' + Date.now();
    const socketId = 'TESTSOCKET1' + Date.now();

    // Connect the socket
    await presenceService.userSocketConnected(
      userId,
      socketId,
      'online',
      'test',
      'faye',
      null, // troupeId
      null, // oauthClientId
      null, // token
      null, // uniqueClientId
      null // eyeballState
    );
    const socketIds = await presenceService.listAllSocketsForUser(userId);
    assert.equal(socketIds.length, 1);
    assert.equal(socketIds[0], socketId);

    // Disconnect the socket
    await presenceService.socketDisconnected(socketId);
    const emptySocketIds = await presenceService.listAllSocketsForUser(userId);
    assert.equal(emptySocketIds.length, 0);
  });

  it('socketExists should work correctly', function() {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    var socketId2 = 'TESTSOCKET2' + Date.now();

    // Connect the socket
    return presenceService
      .userSocketConnected(
        userId,
        socketId,
        'online',
        'test',
        'faye',
        null, // troupeId
        null, // oauthClientId
        null, // token
        null, // uniqueClientId
        null // eyeballState
      )
      .then(function() {
        return presenceService.socketExists(socketId);
      })
      .then(function(exists) {
        assert(exists);

        // Disconnect the socket
        return presenceService.socketDisconnected(socketId);
      })
      .then(function(exists) {
        assert(!exists);

        return presenceService.socketExists(socketId2);
      })
      .then(function(exists) {
        assert(!exists);
      });
  });

  describe('socketReassociated', function() {
    var userId,
      socketId,
      troupeId,
      troupeId2,
      oauthClientId,
      token,
      presenceChangeMock,
      eyeballSignalMock;

    beforeEach(function() {
      userId = 'TESTUSER1' + Date.now();
      socketId = 'TESTSOCKET1' + Date.now();
      troupeId = 'TESTTROUPE1' + Date.now();
      troupeId2 = 'TESTTROUPE2' + Date.now();
      oauthClientId = 'TESTOAUTHCLIENT1' + Date.now();
      token = 'TESTTOKEN1' + Date.now();

      presenceChangeMock = mockito.mockFunction();
      eyeballSignalMock = mockito.mockFunction();

      presenceService.on('presenceChange', presenceChangeMock);
      presenceService.on('eyeballSignal', eyeballSignalMock);
    });

    afterEach(function() {
      presenceService.removeListener('presenceChange', presenceChangeMock);
      presenceService.removeListener('eyeballSignal', eyeballSignalMock);
    });

    describe('non-anonymous', function() {
      it('should reassociate a socket correctly', function() {
        return presenceService
          .userSocketConnected(
            userId,
            socketId,
            'online',
            'test',
            'faye',
            troupeId,
            oauthClientId,
            token,
            null, // uniqueClientId
            true
          )
          .then(function() {
            // Validate user is in troupe1
            return presenceService.listOnlineUsersForTroupes([troupeId]);
          })
          .then(function(online) {
            mockito.verify(presenceChangeMock)(userId, troupeId, true);

            assert.deepEqual(online[troupeId], [userId]);
            return presenceService.socketReassociated(socketId, userId, troupeId2, true);
          })
          .then(function() {
            mockito.verify(presenceChangeMock)(userId, troupeId, false);
            mockito.verify(presenceChangeMock)(userId, troupeId2, true);

            // Validate new presence
            return presenceService.listOnlineUsersForTroupes([troupeId, troupeId2]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            assert.deepEqual(online[troupeId2], [userId]);

            // Validate details on socket
            return presenceService.getSocket(socketId);
          })
          .then(function(socket) {
            assert.strictEqual(socket.userId, userId);
            assert.strictEqual(socket.troupeId, troupeId2);
            assert.strictEqual(socket.eyeballs, true);
            assert.strictEqual(socket.clientType, 'test');
            assert.strictEqual(socket.oauthClientId, oauthClientId);
            assert.strictEqual(socket.token, token);
          });
      });

      it('should reassociate a socket when previously there was no socket', function() {
        return presenceService
          .userSocketConnected(
            userId,
            socketId,
            'online',
            'test',
            'faye',
            null, // troupeId
            null, // oauthClientId
            null, // token
            null, // uniqueClientId
            true
          )
          .then(function() {
            // Validate user is in troupe1
            return presenceService.listOnlineUsersForTroupes([troupeId]);
          })
          .then(function(online) {
            mockito.verify(presenceChangeMock, never())(userId, troupeId, true);
            assert.deepEqual(online[troupeId], []);
            return presenceService.socketReassociated(socketId, userId, troupeId2, true);
          })
          .then(function() {
            mockito.verify(presenceChangeMock, never())(userId, troupeId, false);
            mockito.verify(presenceChangeMock)(userId, troupeId2, true);

            // Validate new presence
            return presenceService.listOnlineUsersForTroupes([troupeId, troupeId2]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            assert.deepEqual(online[troupeId2], [userId]);

            // Validate details on socket
            return presenceService.getSocket(socketId);
          })
          .then(function(socket) {
            assert.strictEqual(socket.userId, userId);
            assert.strictEqual(socket.troupeId, troupeId2);
            assert.strictEqual(socket.eyeballs, true);
            assert.strictEqual(socket.clientType, 'test');
          });
      });

      it('should clear a socket troupe association', function() {
        return presenceService
          .userSocketConnected(
            userId,
            socketId,
            'online',
            'test',
            'faye',
            troupeId,
            null, // oauthClientId
            null, // token
            null, // uniqueClientId
            true
          )
          .then(function() {
            // Validate user is in troupe1
            return presenceService.listOnlineUsersForTroupes([troupeId]);
          })
          .then(function(online) {
            mockito.verify(presenceChangeMock)(userId, troupeId, true);
            assert.deepEqual(online[troupeId], [userId]);
            return presenceService.socketReassociated(socketId, userId, null, true); // Eyeballs true here is incorrect but deliberate as clients can make mistakes
          })
          .then(function() {
            mockito.verify(presenceChangeMock)(userId, troupeId, false);
            mockito.verify(presenceChangeMock, never())(userId, troupeId2, true);

            // Validate new presence
            return presenceService.listOnlineUsersForTroupes([troupeId, troupeId2]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            assert.deepEqual(online[troupeId2], []);

            // Validate details on socket
            return presenceService.getSocket(socketId);
          })
          .then(function(socket) {
            assert.strictEqual(socket.userId, userId);
            assert.strictEqual(socket.troupeId, null);
            assert.strictEqual(socket.eyeballs, false);
            assert.strictEqual(socket.clientType, 'test');
          });
      });
    });

    describe('anonymous', function() {
      it('should reassociate a socket correctly', function() {
        return presenceService
          .userSocketConnected(
            null,
            socketId,
            'online',
            'test',
            'faye',
            troupeId,
            oauthClientId,
            token,
            null, // uniqueClientId
            true
          )
          .then(function() {
            mockito.verify(presenceChangeMock, never())(null, anything(), anything());

            // Validate user is in troupe1
            return presenceService.listOnlineUsersForTroupes([troupeId]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            return presenceService.socketReassociated(socketId, null, troupeId2, true);
          })
          .then(function() {
            mockito.verify(presenceChangeMock, never())(null, anything(), anything());

            // Validate new presence
            return presenceService.listOnlineUsersForTroupes([troupeId, troupeId2]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            assert.deepEqual(online[troupeId2], []);

            // Validate details on socket
            return presenceService.getSocket(socketId);
          })
          .then(function(socket) {
            assert.strictEqual(socket.userId, null);
            assert.strictEqual(socket.troupeId, troupeId2);
            assert.strictEqual(socket.eyeballs, false);
            assert.strictEqual(socket.clientType, 'test');
            assert.strictEqual(socket.oauthClientId, oauthClientId);
            assert.strictEqual(socket.token, token);
          });
      });

      it('should reassociate a socket when previously there was no socket', function() {
        return presenceService
          .userSocketConnected(
            null,
            socketId,
            'online',
            'test',
            'faye',
            null, // troupeId
            null, // oauthClientId
            null, // token
            null, // uniqueClientId
            true
          )
          .then(function() {
            mockito.verify(presenceChangeMock, never())(null, anything(), anything());

            // Validate user is in troupe1
            return presenceService.listOnlineUsersForTroupes([troupeId]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            return presenceService.socketReassociated(socketId, null, troupeId2, true);
          })
          .then(function() {
            mockito.verify(presenceChangeMock, never())(null, anything(), anything());

            // Validate new presence
            return presenceService.listOnlineUsersForTroupes([troupeId, troupeId2]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            assert.deepEqual(online[troupeId2], []);

            // Validate details on socket
            return presenceService.getSocket(socketId);
          })
          .then(function(socket) {
            assert.strictEqual(socket.userId, null);
            assert.strictEqual(socket.troupeId, troupeId2);
            assert.strictEqual(socket.eyeballs, false);
            assert.strictEqual(socket.clientType, 'test');
          });
      });

      it('should clear a socket troupe association', function() {
        return presenceService
          .userSocketConnected(
            null,
            socketId,
            'online',
            'test',
            'faye',
            troupeId,
            null, // oauthClientId
            null, // token
            null, // uniqueClientId
            true
          )
          .then(function() {
            mockito.verify(presenceChangeMock, never())(null, anything(), anything());

            // Validate user is in troupe1
            return presenceService.listOnlineUsersForTroupes([troupeId]);
          })
          .then(function(online) {
            mockito.verify(presenceChangeMock, never())(null, anything(), anything());
            assert.deepEqual(online[troupeId], []);
            return presenceService.socketReassociated(socketId, null, null, true); // Eyeballs true here is incorrect but deliberate as clients can make mistakes
          })
          .then(function() {
            mockito.verify(presenceChangeMock, never())(null, anything(), anything());

            // Validate new presence
            return presenceService.listOnlineUsersForTroupes([troupeId, troupeId2]);
          })
          .then(function(online) {
            assert.deepEqual(online[troupeId], []);
            assert.deepEqual(online[troupeId2], []);

            // Validate details on socket
            return presenceService.getSocket(socketId);
          })
          .then(function(socket) {
            assert.strictEqual(socket.userId, null);
            assert.strictEqual(socket.troupeId, null);
            assert.strictEqual(socket.eyeballs, false);
            assert.strictEqual(socket.clientType, 'test');
          });
      });
    });
  });
});
