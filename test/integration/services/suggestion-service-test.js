'use strict';

var testRequire = require('../test-require');
var suggestionService = testRequire('./services/suggestions-service');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('suggestion-service', function() {
  describe('integration #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      troupe1: { users: ['user1', 'user2'], security: 'PUBLIC' },
      troupe2: { users: ['user2'], security: 'PUBLIC' }
    });

    before(function() {
      suggestionService.testOnly.HIGHLIGHTED_ROOMS.push({
        uri: fixture.troupe1.uri,
        localeLanguage: 'en'
      });

      suggestionService.testOnly.HIGHLIGHTED_ROOMS.push({
        uri: fixture.troupe2.uri,
        localeLanguage: 'en'
      });
    });

    describe('findSuggestionsForUserId', function() {
      it('should return suggestions', function() {
        return suggestionService
          .findSuggestionsForUserId(fixture.user1._id)
          .then(function(suggestions) {
            assert(
              suggestions.some(function(f) {
                return String(f._id) === fixture.troupe2.id;
              })
            );
          });
      });
    });

    describe('findSuggestionsForRooms', function() {
      it('should return suggestions', function() {
        return suggestionService
          .findSuggestionsForRooms({
            user: fixture.user1,
            rooms: [fixture.troupe1],
            language: 'en'
          })
          .then(function(suggestions) {
            assert(
              suggestions.some(function(f) {
                return String(f._id) === fixture.troupe2.id;
              })
            );
          });
      });
    });
  });
});
