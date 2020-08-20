'use strict';

var chatsForRoomSearch = require('../lib/chats-for-room-search');

describe('chats-for-room-search', function() {
  describe('integration tests #slow', function() {
    it('does not crash', function() {
      return chatsForRoomSearch.searchRoom(
        '1',
        {
          analyzers: ['default'],
          queryString: 'hello'
        },
        {}
      );
    });
  });
});
