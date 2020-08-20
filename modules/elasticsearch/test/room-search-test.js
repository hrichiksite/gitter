'use strict';

var roomSearch = require('../lib/room-search');

describe('room-search', function() {
  describe('integration tests #slow', function() {
    it('does not crash', function() {
      return roomSearch.searchRooms('moo', '1', [], {});
    });
  });
});
