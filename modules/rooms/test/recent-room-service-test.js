/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var recentRoomService = require('../lib/recent-room-service');
var recentRoomCore = require('../lib/recent-room-core');
const roomFavouritesCore = require('../lib/room-favourites-core');
var persistenceService = require('gitter-web-persistence');

describe('recent-room-service', function() {
  describe('ordering', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      userNoTroupes: {},
      troupe1: { users: ['user1'] },
      troupe2: { users: ['user1'] },
      troupe3: { users: ['user1'] },
      troupe4: { users: ['user1'] }
    });

    it('should rearrange the order of favourites correctly', function() {
      this.timeout(10000);

      function getFavs() {
        return roomFavouritesCore.findFavouriteTroupesForUser(fixture.user1.id);
      }

      return recentRoomService
        .updateFavourite(fixture.user1.id, fixture.troupe1.id, 1)
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 1);
        })
        .then(function() {
          return recentRoomService.updateFavourite(fixture.user1.id, fixture.troupe2.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 1);
        })
        .then(function() {
          return recentRoomService.updateFavourite(fixture.user1.id, fixture.troupe2.id, 3);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
        })
        .then(function() {
          return recentRoomService.updateFavourite(fixture.user1.id, fixture.troupe3.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
        })
        .then(function() {
          return recentRoomService.updateFavourite(fixture.user1.id, fixture.troupe2.id, 2);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe2.id], 2);
          assert.equal(favs[fixture.troupe1.id], 3);
        })
        .then(function() {
          return recentRoomService.updateFavourite(fixture.user1.id, fixture.troupe1.id, 4);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe2.id], 2);
          assert.equal(favs[fixture.troupe1.id], 4);
        })
        .then(function() {
          return recentRoomService.updateFavourite(fixture.user1.id, fixture.troupe4.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe4.id], 1);
          assert.equal(favs[fixture.troupe3.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
          assert.equal(favs[fixture.troupe1.id], 4);
        });
    });
  });

  describe('#updateFavourite()', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'] }
    });

    it('should add a troupe to favourites', function() {
      function fav(val) {
        return recentRoomService
          .updateFavourite(fixture.user1.id, fixture.troupe1.id, val)
          .then(function() {
            return roomFavouritesCore.findFavouriteTroupesForUser(fixture.user1.id);
          })
          .then(function(favs) {
            var isInTroupe = !!favs[fixture.troupe1.id];
            assert(isInTroupe === val, 'Troupe should ' + (val ? '' : 'not ') + 'be a favourite');
          });
      }

      return fav(true)
        .then(() => fav(true))
        .then(() => fav(false))
        .then(() => fav(true));
    });
  });

  describe('#saveLastVisitedTroupeforUserId', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'] }
    });

    it('should record the time each troupe was last accessed by a user', function() {
      return recentRoomService
        .saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id)
        .then(function() {
          return persistenceService.User.findById(fixture.user1.id).exec();
        })
        .then(function(user) {
          assert.equal(user.lastTroupe, fixture.troupe1.id);

          return recentRoomCore.getTroupeLastAccessTimesForUser(fixture.user1.id);
        })
        .then(function(times) {
          var troupeId = '' + fixture.troupe1.id;

          var after = times[troupeId];
          assert(after, 'Expected a value for last access time');

          return recentRoomService
            .saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id)
            .then(function() {
              return recentRoomCore.getTroupeLastAccessTimesForUser(fixture.user1.id);
            })
            .then(function(times) {
              assert(
                times[troupeId] > after,
                'The last access time for this troupe has not changed. Before it was ' +
                  after +
                  ' now it is ' +
                  times[troupeId]
              );
            });
        });
    });
  });

  describe('#findInitialRoomUrlForUser', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      userNoTroupes: {},
      troupe1: { users: ['user1'] },
      troupeOneToOne: { oneToOne: true, users: ['user1', 'user2'] }
    });

    it('#01 should return null when a user has no troupes', function() {
      return recentRoomService
        .saveLastVisitedTroupeforUserId(fixture.userNoTroupes.id, fixture.troupe1.id)
        .then(function() {
          fixture.userNoTroupes.lastTroupe = fixture.troupe1.id;
          return recentRoomService.findInitialRoomUrlForUser(fixture.userNoTroupes);
        })
        .then(function(url) {
          assert(url === null, 'Expected the url to be null');
        });
    });

    it('#02 should return return the users last troupe when they have one', function() {
      return recentRoomService
        .saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id)
        .then(function() {
          return recentRoomService.findInitialRoomUrlForUser(fixture.user1);
        })
        .then(function(url) {
          assert.strictEqual(url, '/' + fixture.troupe1.uri);
        });
    });

    it('#03 should return the users something when the user has troupes, but no last troupe', function() {
      return recentRoomService.findInitialRoomUrlForUser(fixture.user1).then(function(url) {
        assert(url !== null, 'Expected the troupe not to be null');
      });
    });

    it('#04 should return one to one rooms', function() {
      return recentRoomService
        .saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupeOneToOne.id)
        .then(function() {
          return recentRoomService.findInitialRoomUrlForUser(fixture.user1);
        })
        .then(function(url) {
          assert.strictEqual(url, '/' + fixture.user2.username);
        });
    });
  });
});
