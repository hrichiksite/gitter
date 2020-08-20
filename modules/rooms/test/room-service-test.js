'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var ObjectID = require('mongodb').ObjectID;
var StatusError = require('statuserror');

var mockito = require('jsmockito').JsMockito;
var times = mockito.Verifiers.times;
var once = times(1);

var persistence = require('gitter-web-persistence');

require('../lib/room-service');

// to work around proxyquire caching bugs...
require('../lib/room-service');

describe('room-service', function() {
  describe('addUserToRoom', function() {
    function createRoomServiceWithStubs(stubs) {
      return proxyquireNoCallThru('../lib/room-service', {
        'gitter-web-permissions/lib/add-invite-policy-factory': {
          createPolicyForRoomAdd: function() {
            return Promise.resolve({
              canJoin: function() {
                return Promise.resolve(stubs.canBeInvited);
              }
            });
          }
        },
        'gitter-web-email-notifications': {
          sendInvitation: stubs.onInviteEmail,
          addedToRoomNotification: function() {
            return Promise.resolve();
          }
        },
        'gitter-web-email-addresses': function() {
          return Promise.resolve('a@b.com');
        }
      });
    }

    it('adds a user to the troupe', function() {
      var service = createRoomServiceWithStubs({
        canBeInvited: true,
        onInviteEmail: function() {
          return Promise.resolve();
        }
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();
      var _userToAddId = new ObjectID();

      var troupe = {
        _id: _troupId,
        id: _troupId.toString(),
        uri: 'user/room',
        sd: {
          public: true
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      var userToAdd = {
        _id: _userToAddId,
        id: _userToAddId.toString(),
        username: 'test-user'
      };

      return service.addUserToRoom(troupe, user, userToAdd);
    });

    it('saves troupe changes', function() {
      var service = createRoomServiceWithStubs({
        canBeInvited: true,
        onInviteEmail: function() {
          return Promise.resolve();
        }
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();
      var _userToAddId = new ObjectID();

      var troupe = {
        _id: _troupId,
        id: _troupId.toString(),
        uri: 'user/room',
        sd: {
          public: true
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      var userToAdd = {
        _id: _userToAddId,
        id: _userToAddId.toString(),
        username: 'test-user'
      };

      return service.addUserToRoom(troupe, user, userToAdd);
    });

    it('returns the added user and sets the date the user was added', function() {
      var service = createRoomServiceWithStubs({
        canBeInvited: true,
        onInviteEmail: function() {
          return Promise.resolve();
        }
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();
      var _userToAddId = new ObjectID();

      var troupe = {
        _id: _troupId,
        uri: 'user/room',
        sd: {
          public: true
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      var userToAdd = {
        _id: _userToAddId,
        id: _userToAddId.toString(),
        username: 'test-user'
      };

      return service
        .addUserToRoom(troupe, user, userToAdd)
        .then(function(user) {
          assert.equal(user.id, _userToAddId);
          assert.equal(user.username, 'test-user');

          return persistence.UserTroupeLastAccess.findOne({ userId: user.id }).exec();
        })
        .then(function(lastAccess) {
          assert(lastAccess);
          assert(lastAccess.added);
          assert(lastAccess.added[troupe.id]);
          assert(Date.now() - lastAccess.added[troupe.id] <= 30000);
        });
    });

    it('attempts an email invite for new users', function() {
      var service = createRoomServiceWithStubs({
        canBeInvited: true,
        onInviteEmail: function() {
          return Promise.resolve();
        }
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();
      var _userToAddId = new ObjectID();

      var troupe = {
        _id: _troupId,
        uri: 'user/room',
        sd: {
          public: true
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      var userToAdd = {
        _id: _userToAddId,
        id: _userToAddId.toString(),
        username: 'test-user'
      };

      return service.addUserToRoom(troupe, user, userToAdd);
    });

    it('fails with 403 when adding someone to who cant be invited', function() {
      var service = createRoomServiceWithStubs({
        findByUsernameResult: null,
        createInvitedUserResult: { username: 'test-user', id: 'test-user-id', state: 'INVITED' },
        canBeInvited: false,
        onInviteEmail: function() {
          return Promise.resolve();
        }
      });

      var _userToAddId = new ObjectID();

      var troupe = {
        uri: 'user/room'
      };

      var userToAdd = {
        _id: _userToAddId,
        id: _userToAddId.toString(),
        username: 'test-user'
      };

      return service.addUserToRoom(troupe, {}, userToAdd).then(
        function() {
          assert.ok(false, 'Expected exception');
        },
        function(err) {
          assert.equal(err.status, 403);
        }
      );
    });

    it('should not fail when adding someone who is already in the room', function() {
      var service = createRoomServiceWithStubs({
        canBeInvited: true,
        onInviteEmail: function() {
          return Promise.resolve();
        }
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();
      var _userToAddId = new ObjectID();

      var troupe = {
        _id: _troupId,
        uri: 'user/room',
        sd: {
          public: true
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      var userToAdd = {
        _id: _userToAddId,
        id: _userToAddId.toString(),
        username: 'test-user'
      };

      return service.addUserToRoom(troupe, user, userToAdd);
    });
  });

  describe('removals', function() {
    var fixture = fixtureLoader.setup({
      troupeCanRemove: {
        security: 'PUBLIC',
        githubType: 'REPO',
        users: ['userToRemove', 'userRemoveNonAdmin', 'userRemoveAdmin']
      },
      troupeCannotRemove: {
        oneToOne: true,
        users: ['userToRemove', 'userRemoveAdmin']
      },
      userToRemove: {},
      userRemoveAdmin: {}
    });

    var roomService = proxyquireNoCallThru('../lib/room-service', {
      'gitter-web-permissions/lib/policy-factory': {
        createPolicyForRoom: function(user /*, room*/) {
          return Promise.resolve({
            canAdmin: function() {
              if (user.id === fixture.userRemoveNonAdmin.id) {
                return Promise.resolve(false);
              } else if (user.id === fixture.userRemoveAdmin.id) {
                return Promise.resolve(true);
              } else {
                assert(false, 'Unknown user');
              }
              return Promise.resolve(true);
            }
          });
        }
      }
    });

    var roomMembershipService = require('../lib/room-membership-service');

    it('should prevent from removing users from one-to-one rooms', function() {
      return roomMembershipService
        .checkRoomMembership(fixture.troupeCannotRemove._id, fixture.userToRemove._id)
        .then(function(here) {
          assert(here);
          return roomService.removeUserFromRoom(
            fixture.troupeCannotRemove,
            fixture.userToRemove,
            fixture.userRemoveAdmin
          );
        })
        .catch(function(err) {
          assert.equal(err.status, 400);
          assert.equal(err.message, 'This room does not support removing.');
        })
        .then(function() {
          return roomMembershipService.checkRoomMembership(
            fixture.troupeCannotRemove._id,
            fixture.userToRemove._id
          );
        })
        .then(function(here) {
          assert(here);
        });
    });

    it('should remove users from rooms', function() {
      return roomMembershipService
        .checkRoomMembership(fixture.troupeCanRemove._id, fixture.userToRemove._id)
        .then(function(here) {
          assert(here);
          return roomService.removeUserFromRoom(
            fixture.troupeCanRemove,
            fixture.userToRemove,
            fixture.userRemoveAdmin
          );
        })
        .then(function() {
          return roomMembershipService.checkRoomMembership(
            fixture.troupeCanRemove._id,
            fixture.userToRemove._id
          );
        })
        .then(function(here) {
          assert(!here);
        });
    });
  });

  describe('remove and hide #slow', function() {
    var troupeService = require('../lib/troupe-service');
    var recentRoomService = require('../lib/recent-room-service');
    var roomFavouritesCore = require('../lib/room-favourites-core');
    var roomMembershipService = require('../lib/room-membership-service');
    var appEvents = require('gitter-web-appevents');

    describe('room-service #slow', function() {
      var fixture = fixtureLoader.setup({
        troupeCanRemove: {
          security: 'PUBLIC',
          githubType: 'REPO',
          users: [
            'userFavourite',
            'userLeave',
            'userToRemove',
            'userRemoveNonAdmin',
            'userRemoveAdmin'
          ]
        },
        troupeCannotRemove: {
          security: 'PRIVATE',
          githubType: 'ONETOONE',
          users: ['userToRemove', 'userRemoveAdmin']
        },
        troupeEmpty: {
          security: 'PUBLIC',
          githubType: 'REPO',
          users: []
        },
        userFavourite: {},
        userLeave: {},
        userToRemove: {},
        userRemoveNonAdmin: {},
        userRemoveAdmin: {}
      });

      describe('#removeFavourite', function() {
        var roomService = require('../lib/room-service');

        var getFavs = function() {
          return roomFavouritesCore.findFavouriteTroupesForUser(fixture.userFavourite.id);
        };

        var createFav = function() {
          return recentRoomService
            .updateFavourite(fixture.userFavourite.id, fixture.troupeCanRemove.id, true)
            .then(getFavs)
            .then(function(favs) {
              assert(favs[fixture.troupeCanRemove.id]); // Favourite is created
            });
        };

        var checkHere = function() {
          return roomMembershipService.checkRoomMembership(
            fixture.troupeCanRemove._id,
            fixture.userFavourite._id
          );
        };

        beforeEach(function() {
          if (this._skipFixtureSetup) return;

          return createFav();
        });

        it('should remove favourite', function() {
          var checkEvent = appEvents.addListener('dataChange2', {
            url: '/user/' + fixture.userFavourite.id + '/rooms',
            operation: 'patch',
            model: {
              id: fixture.troupeCanRemove.id,
              favourite: null,
              lastAccessTime: null,
              mentions: 0,
              unreadItems: 0,
              activity: 0
            }
          });

          return roomService
            .hideRoomFromUser(fixture.troupeCanRemove, fixture.userFavourite.id)
            .then(checkEvent) // Ensure event was emitted
            .then(getFavs)
            .then(function(favs) {
              assert(!favs[fixture.troupeCanRemove.id]); // Favourite is removed
            })
            .then(checkHere)
            .then(function(here) {
              assert(here); // User is still in room
            });
        });

        it('should remove user from the room if mode=mute', function() {
          // Set user as lurking
          return roomMembershipService
            .setMembershipMode(fixture.userFavourite.id, fixture.troupeCanRemove.id, 'mute', false)
            .then(function() {
              // Get updated troupe
              return troupeService.findById(fixture.troupeCanRemove.id);
            })
            .then(function(troupe) {
              return roomService.hideRoomFromUser(troupe, fixture.userFavourite.id);
            })
            .then(getFavs)
            .then(function(favs) {
              assert(!favs[fixture.troupeCanRemove.id]); // Favourite is removed
            })
            .then(checkHere)
            .then(function(here) {
              assert(!here); // User has been removed
            });
        });

        it('should remove user from the room if mode=mute', function() {
          // Set user as lurking
          return roomMembershipService
            .setMembershipMode(fixture.userFavourite.id, fixture.troupeCanRemove.id, 'mute', false)
            .then(function() {
              // Get updated troupe
              return troupeService.findById(fixture.troupeCanRemove.id);
            })
            .then(function(troupe) {
              return roomService.hideRoomFromUser(troupe, fixture.userFavourite.id);
            })
            .then(getFavs)
            .then(function(favs) {
              assert(!favs[fixture.troupeCanRemove.id]); // Favourite is removed
            })
            .then(checkHere)
            .then(function(here) {
              assert(!here); // User has been removed
            });
        });

        it('should check if the proper event is emitted when the favourite is removed', function() {
          var checkEvent = appEvents.addListener('dataChange2', {
            url: '/user/' + fixture.userFavourite.id + '/rooms',
            operation: 'remove',
            model: { id: fixture.troupeEmpty.id }
          });

          return roomMembershipService
            .checkRoomMembership(fixture.troupeEmpty._id, fixture.userFavourite._id)
            .then(function(here) {
              assert(!here); // Check that user is not in the room
            })
            .then(function() {
              return roomService.hideRoomFromUser(fixture.troupeEmpty, fixture.userFavourite.id);
            })
            .then(checkEvent) // Ensure event was emitted
            .then(getFavs)
            .then(function(favs) {
              assert(!favs[fixture.troupeEmpty.id]); // Favourite is removed
            });
        });
      });

      describe('#removeUserFromRoom', function() {
        var roomService = require('../lib/room-service');

        it('should remove user from room', function() {
          return roomMembershipService
            .checkRoomMembership(fixture.troupeCanRemove._id, fixture.userLeave._id)
            .then(function(here) {
              assert(here);
              return roomService.removeUserFromRoom(
                fixture.troupeCanRemove,
                fixture.userLeave,
                fixture.userLeave
              );
            })
            .then(function() {
              return roomMembershipService.checkRoomMembership(
                fixture.troupeCanRemove._id,
                fixture.userLeave._id
              );
            })
            .then(function(here) {
              assert(!here);
            });
        });
      });

      describe('#removeUserFromRoom', function() {
        var roomService = require('../lib/room-service');

        it('should remove users from rooms', function() {
          return roomMembershipService
            .checkRoomMembership(fixture.troupeCanRemove._id, fixture.userToRemove._id)
            .then(function(here) {
              assert(here);
              return roomService.removeUserFromRoom(
                fixture.troupeCanRemove,
                fixture.userToRemove,
                fixture.userRemoveAdmin
              );
            })
            .then(function() {
              return roomMembershipService.checkRoomMembership(
                fixture.troupeCanRemove._id,
                fixture.userToRemove._id
              );
            })
            .then(function(here) {
              assert(!here);
            });
        });
      });
    });
  });

  describe('findAllRoomsIdsForUserIncludingMentions', function() {
    var getRoomIdsMentioningUserMock, findRoomIdsForUserMock, roomService;

    beforeEach(function() {
      getRoomIdsMentioningUserMock = mockito.mockFunction();
      findRoomIdsForUserMock = mockito.mockFunction();
      roomService = proxyquireNoCallThru('../lib/room-service', {
        'gitter-web-unread-items': {
          getRoomIdsMentioningUser: getRoomIdsMentioningUserMock
        },
        './room-membership-service': {
          findRoomIdsForUser: findRoomIdsForUserMock
        }
      });
    });

    function runWithValues(roomIdsForUser, roomIdsMentioningUser, expected, expectedNonMembers) {
      var userId = 'user1';

      mockito
        .when(getRoomIdsMentioningUserMock)()
        .then(function(pUserId) {
          assert.strictEqual(pUserId, userId);
          return Promise.resolve(roomIdsMentioningUser);
        });

      mockito
        .when(findRoomIdsForUserMock)()
        .then(function(pUserId) {
          assert.strictEqual(pUserId, userId);
          return Promise.resolve(roomIdsForUser);
        });

      return roomService
        .findAllRoomsIdsForUserIncludingMentions(userId)
        .spread(function(allTroupeIds, nonMemberTroupeIds) {
          allTroupeIds.sort();
          nonMemberTroupeIds.sort();
          expected.sort();
          expectedNonMembers.sort();
          assert.deepEqual(allTroupeIds, expected);
          assert.deepEqual(nonMemberTroupeIds, expectedNonMembers);
        });
    }

    it('should handle the trivial case of no rooms', function() {
      return runWithValues([], [], [], []);
    });

    it('should handle the non member rooms only case', function() {
      return runWithValues([], ['1'], ['1'], ['1']);
    });

    it('should handle the member rooms only case', function() {
      return runWithValues(['1'], [], ['1'], []);
    });

    it('should handle the member rooms only case with mentions', function() {
      return runWithValues(['1'], ['1'], ['1'], []);
    });

    it('should handle the mixed cases', function() {
      return runWithValues(['1', '2', '3'], ['2', '3', '4'], ['1', '2', '3', '4'], ['4']);
    });
  });

  describe('joinRoom', function() {
    describe('unit tests', function() {
      var roomService;
      var assertJoinRoomChecks;
      var recentRoomServiceSaveLastVisitedTroupeforUserId;
      var roomMembershipServiceAddRoomMember;
      var troupe;
      var joinRoomCheckFailed;
      var user;
      var userId;
      var troupeId;

      beforeEach(function() {
        userId = 'userId1';
        troupeId = 'troupeId1';
        user = {
          id: userId,
          _id: userId
        };
        troupe = {
          id: troupeId,
          _id: troupeId
        };

        assertJoinRoomChecks = mockito.mockFunction();
        recentRoomServiceSaveLastVisitedTroupeforUserId = mockito.mockFunction();
        roomMembershipServiceAddRoomMember = mockito.mockFunction();

        mockito
          .when(assertJoinRoomChecks)()
          .then(function(pRoom, pUser) {
            assert.strictEqual(pUser, user);
            assert.strictEqual(pRoom, troupe);
            if (joinRoomCheckFailed) return Promise.reject(new StatusError());
            return Promise.resolve();
          });

        mockito
          .when(recentRoomServiceSaveLastVisitedTroupeforUserId)()
          .then(function(pUserId, pRoomId, pOptions) {
            assert.strictEqual(pUserId, userId);
            assert.strictEqual(pRoomId, troupeId);
            assert.deepEqual(pOptions, { skipFayeUpdate: true });
            return Promise.resolve();
          });

        mockito
          .when(roomMembershipServiceAddRoomMember)()
          .then(function(pRoomId, pUserId) {
            assert.strictEqual(pUserId, userId);
            assert.strictEqual(pRoomId, troupeId);
            return Promise.resolve();
          });

        roomService = proxyquireNoCallThru('../lib/room-service', {
          './room-membership-service': {
            addRoomMember: roomMembershipServiceAddRoomMember
          },
          './assert-join-room-checks': assertJoinRoomChecks,
          './recent-room-service': {
            saveLastVisitedTroupeforUserId: recentRoomServiceSaveLastVisitedTroupeforUserId
          }
        });
      });

      it('should allow a user to join a room', function() {
        joinRoomCheckFailed = false;

        return roomService.joinRoom(troupe, user).then(function() {
          mockito.verify(assertJoinRoomChecks, once)();
          mockito.verify(recentRoomServiceSaveLastVisitedTroupeforUserId, once)();
          mockito.verify(roomMembershipServiceAddRoomMember, once)();
        });
      });

      it('should deny a user join room there are too many people in the room', function() {
        joinRoomCheckFailed = true;

        return roomService
          .joinRoom(troupe, user)
          .then(function() {
            assert.ok(false, 'Expected an exception');
          })
          .catch(() => {
            // This is what we want...
          })
          .then(function() {
            mockito.verify(assertJoinRoomChecks, once)();
          });
      });
    });

    describe('integration tests #slow', function() {
      var roomService;
      var createPolicyForRoom;
      var access;
      var roomMembershipService;

      var fixture = fixtureLoader.setup({
        troupeOrg1: {
          githubType: 'ORG',
          users: []
        },
        user1: {}
      });

      beforeEach(function() {
        roomMembershipService = require('../lib/room-membership-service');
        createPolicyForRoom = mockito.mockFunction();

        mockito
          .when(createPolicyForRoom)()
          .then(function(pUser, pRoom) {
            assert.strictEqual(pUser, fixture.user1);
            assert.strictEqual(pRoom.id, fixture.troupeOrg1.id);
            return Promise.resolve({
              canJoin: function() {
                return Promise.resolve(access);
              }
            });
          });

        roomService = proxyquireNoCallThru('../lib/room-service', {
          'gitter-web-permissions/lib/policy-factory': {
            createPolicyForRoom: createPolicyForRoom
          }
        });
      });

      it('should add a member to the room', function() {
        access = true;

        return roomService
          .joinRoom(fixture.troupeOrg1, fixture.user1)
          .then(function() {
            return roomMembershipService.checkRoomMembership(
              fixture.troupeOrg1.id,
              fixture.user1.id
            );
          })
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          });
      });

      it('should be idempotent', function() {
        access = true;

        return roomService
          .joinRoom(fixture.troupeOrg1, fixture.user1)
          .then(function() {
            return roomMembershipService.checkRoomMembership(
              fixture.troupeOrg1.id,
              fixture.user1.id
            );
          })
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
            return roomService.joinRoom(fixture.troupeOrg1, fixture.user1);
          })
          .then(function() {
            return roomMembershipService.checkRoomMembership(
              fixture.troupeOrg1.id,
              fixture.user1.id
            );
          })
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          });
      });
    });
  });

  describe('updateTopic #slow', function() {
    var roomService = require('../lib/room-service');

    var fixture = fixtureLoader.setup({
      troupe1: {}
    });

    it('should update the topic', function() {
      return roomService
        .updateTopic(fixture.troupe1.id, 'THE TOPIC')
        .then(function() {
          return persistence.Troupe.findById(fixture.troupe1.id).exec();
        })
        .then(function(troupe) {
          assert.strictEqual(troupe.topic, 'THE TOPIC');
        });
    });

    it('null should update the topic', function() {
      return roomService
        .updateTopic(fixture.troupe1.id, null)
        .then(function() {
          return persistence.Troupe.findById(fixture.troupe1.id).exec();
        })
        .then(function(troupe) {
          assert.strictEqual(troupe.topic, '');
        });
    });
  });
});
