'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var groupFavouritesCore = require('../lib/group-favourites-core');

describe('group-core', function() {
  describe('ordering #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      userNoGroups: {},
      group1: {},
      group2: {},
      group3: {},
      group4: {},
      troupe1: {
        group: 'group1',
        users: ['user1']
      },
      troupe2: {
        group: 'group2',
        users: ['user1']
      },
      troupe3: {
        group: 'group3',
        users: ['user1']
      },
      troupe4: {
        group: 'group4',
        users: ['user1']
      }
    });

    // From `gitter-web-rooms/test/recent-room-core-test.js`
    it('should rearrange the order of favourites correctly', function(done) {
      this.timeout(10000);

      function getFavs() {
        return groupFavouritesCore.findFavouriteGroupsForUser(fixture.user1.id);
      }

      groupFavouritesCore
        .updateFavourite(fixture.user1.id, fixture.group1.id, 1)
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.group1.id], 1);
        })
        .then(function() {
          return groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group2.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.group1.id], 2);
          assert.equal(favs[fixture.group2.id], 1);
        })
        .then(function() {
          return groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group2.id, 3);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.group1.id], 2);
          assert.equal(favs[fixture.group2.id], 3);
        })
        .then(function() {
          return groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group3.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.group3.id], 1);
          assert.equal(favs[fixture.group1.id], 2);
          assert.equal(favs[fixture.group2.id], 3);
        })
        .then(function() {
          return groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group2.id, 2);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.group3.id], 1);
          assert.equal(favs[fixture.group2.id], 2);
          assert.equal(favs[fixture.group1.id], 3);
        })
        .then(function() {
          return groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group1.id, 4);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.group3.id], 1);
          assert.equal(favs[fixture.group2.id], 2);
          assert.equal(favs[fixture.group1.id], 4);
        })
        .then(function() {
          return groupFavouritesCore.updateFavourite(fixture.user1.id, fixture.group4.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.group4.id], 1);
          assert.equal(favs[fixture.group3.id], 2);
          assert.equal(favs[fixture.group2.id], 3);
          assert.equal(favs[fixture.group1.id], 4);
        })

        .nodeify(done);
    });
  });

  describe('updateFavourite #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      group1: {},
      troupe1: {
        group: 'group1',
        users: ['user1']
      }
    });

    it('should add a group to favourites', function(done) {
      function fav(val, callback) {
        return groupFavouritesCore
          .updateFavourite(fixture.user1.id, fixture.group1.id, val)
          .then(function() {
            return groupFavouritesCore.findFavouriteGroupsForUser(fixture.user1.id);
          })
          .then(function(favs) {
            var isInGroup = !!favs[fixture.troupe1.id];
            assert(isInGroup === val, 'Group should ' + (val ? '' : 'not ') + 'be a favourite');
          })
          .nodeify(callback);
      }

      fav(true, function() {
        fav(true, function() {
          fav(false, function() {
            fav(false, function() {
              done();
            });
          });
        });
      });
    });
  });
});
