'use strict';

var assert = require('assert');
var suggestions = require('..');

describe('graph-suggestions', function() {
  describe('getSuggestionsForRooms', function() {
    /*
    This just tests to see of the query syntax is fine, basically. Can't do
    much without the app's code in here..
    */
    it('returns a blank array when given a blank array', function() {
      var rooms = [];
      suggestions.getSuggestionsForRooms(rooms).then(function(roomIds) {
        assert(Array.isArray(roomIds));
      });
    });
  });
});
