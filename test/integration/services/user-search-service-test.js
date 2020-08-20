/*global describe:true, it:true, before:false, after:false  */
'use strict';

var testRequire = require('./../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var userSearchService = testRequire('./services/user-search-service');
var assert = require('assert');

describe('User Search Service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    user2: {},
    user3: {},
    userNoTroupes: {},
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {},
    troupe3: {
      /* This troupe should not include test user 2 */
      //uri: 'testtroupe3',
      users: ['user1', 'user3']
    }
  });

  describe('#createRegExpsForQuery', function() {
    it('should create a single regexp for a single word search', function() {
      userSearchService.testOnly.createRegExpsForQuery('Frodo').then(function(res) {
        assert(res.length === 1, 'Expected a single regular expression');
        assert.strictEqual(res[0].toString(), '/\\bfrodo/i', 'Expected the search');
      });
    });

    it('should create a double regexp for a double word search', function() {
      userSearchService.testOnly.createRegExpsForQuery('Frodo Baggins').then(function(res) {
        assert(res.length === 2, 'Expected a single regular expression');
        assert.strictEqual(res[0].toString(), '/\\bfrodo/i', 'Expected the search');
        assert.strictEqual(res[1].toString(), '/\\bbaggins/i', 'Expected the search');
      });
    });

    it('should handle irish names', function() {
      userSearchService.testOnly.createRegExpsForQuery("Frodo O'Grady").then(function(res) {
        assert(res.length === 3, 'Expected three regular expressions');
        assert.strictEqual(res[0].toString(), '/\\bfrodo/i', 'Expected the search');
        assert.strictEqual(res[1].toString(), '/\\bo/i', 'Expected the search');
        assert.strictEqual(res[2].toString(), '/\\bgrady/i', 'Expected the search');
      });
    });

    it('should handle numbers', function() {
      userSearchService.testOnly.createRegExpsForQuery('Test User 1').then(function(res) {
        assert(res.length === 3, 'Expected a three regular expression');
        assert.strictEqual(res[0].toString(), '/\\btest/i', 'Expected the search');
        assert.strictEqual(res[1].toString(), '/\\buser/i', 'Expected the search');
        assert.strictEqual(res[2].toString(), '/\\b1/i', 'Expected the search');
      });
    });
  });

  describe('#searchForUsers', function() {
    it('should find both test users', function(done) {
      var userId = fixture.user1.id;

      userSearchService.searchForUsers(userId, 'tEst', {}, function(err, searchResults) {
        if (err) return done(err);
        assert(searchResults.results.length >= 2, 'Expect some users');

        assert(
          searchResults.results.filter(function(f) {
            return f.displayName === fixture.user1.displayName;
          }).length === 0,
          'Expect test user 1 not to be returned'
        );
        assert(
          searchResults.results.filter(function(f) {
            return f.displayName === fixture.user2.displayName;
          }).length === 1,
          'Expect test user 2'
        );
        assert(
          searchResults.results.filter(function(f) {
            return f.displayName === fixture.user3.displayName;
          }).length === 1,
          'Expect test user 3'
        );

        return done();
      });
    });

    it('should find one Test Users 2 and 3', function(done) {
      var userId = fixture.user1.id;

      userSearchService.searchForUsers(userId, 'tEst user 2', {}, function(err, searchResults) {
        if (err) return done(err);

        assert(
          searchResults.results.length >= 1,
          'Expect one user: got ' + searchResults.results.join(', ')
        );
        assert(
          searchResults.results.filter(function(f) {
            return f.displayName === fixture.user2.displayName;
          }).length === 1,
          'Expect test user 2'
        );

        return done();
      });
    });

    it('should not find test user three when a testtroupe3 is excluded', function(done) {
      var userId = fixture.user1.id;

      userSearchService.searchForUsers(
        userId,
        'tEst user',
        { excludeTroupeId: fixture.troupe3.id },
        function(err, searchResults) {
          if (err) return done(err);

          assert(
            searchResults.results.filter(function(f) {
              return f.displayName === fixture.user2.displayName;
            }).length === 1,
            'Expected to find test user 2'
          );
          assert(
            searchResults.results.filter(function(f) {
              return f.displayName === fixture.user3.displayName;
            }).length === 0,
            'Expected to not find test user 3'
          );

          return done();
        }
      );
    });

    it('should not find an unknown users', function(done) {
      var userId = fixture.user1.id;

      userSearchService.searchForUsers(userId, 'Noddy Obama McBigbones', {}, function(
        err,
        searchResults
      ) {
        if (err) return done(err);
        assert(searchResults.results.length === 0, 'Expect no users');
        return done();
      });
    });
  });
});
