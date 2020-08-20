'use strict';

var chatsForRoomSearch = require('../lib/chats-for-user-search');

describe('chats-for-user-search', function() {
  describe('integration tests #slow', function() {
    it('does not crash', function() {
      return chatsForRoomSearch.searchChatsForUserId('1');
    });
  });
});
