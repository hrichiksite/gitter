'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const roomFavouritesCore = require('../lib/room-favourites-core');

describe('recent-room-core', function() {
  describe('ordering #slow', function() {
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

      return roomFavouritesCore
        .updateFavourite(fixture.user1.id, fixture.troupe1.id, 1)
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 1);
        })
        .then(function() {
          return roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe2.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 1);
        })
        .then(function() {
          return roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe2.id, 3);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
        })
        .then(function() {
          return roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe3.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
        })
        .then(function() {
          return roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe2.id, 2);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe2.id], 2);
          assert.equal(favs[fixture.troupe1.id], 3);
        })
        .then(function() {
          return roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe1.id, 4);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe2.id], 2);
          assert.equal(favs[fixture.troupe1.id], 4);
        })
        .then(function() {
          return roomFavouritesCore.updateFavourite(fixture.user1.id, fixture.troupe4.id, 1);
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

  describe('updateFavourite #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'] }
    });

    it('should add a troupe to favourites', function() {
      function fav(val) {
        return roomFavouritesCore
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
});
