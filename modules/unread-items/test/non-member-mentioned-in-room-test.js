'use strict';

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const chatService = require('gitter-web-chats');
const unreadItemService = require('../');
const appEvents = require('gitter-web-appevents');

describe('unread item end-to-end integration tests #slow', function() {
  const fixture = fixtureLoader.setup({
    user1: { username: true },
    user2: { username: true },
    user3: { username: true },
    troupe1: { users: ['user1'], githubType: 'REPO_CHANNEL', security: 'PUBLIC' },
    troupe2: { users: ['user1'], githubType: 'ORG_CHANNEL', security: 'PRIVATE' }
  });

  it('should notify when the user has access', async function() {
    const troupe = fixture.troupe1;
    const troupeId = troupe.id;
    const user2 = fixture.user2;

    let onUserMentionedInNonMemberRoom = 0;
    appEvents.onUserMentionedInNonMemberRoom(function(data) {
      if (String(data.userId) === String(user2.id)) {
        onUserMentionedInNonMemberRoom++;
      }
    });

    const chat = await chatService.newChatMessageToTroupe(troupe, fixture.user1, {
      text: 'Hey there @' + user2.username
    });
    // chatService doesn't wait for unreadItemService so we have to
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.strictEqual(onUserMentionedInNonMemberRoom, 1);
    const x = await unreadItemService.getUnreadItems(user2.id, troupeId);
    assert.deepEqual(x, [chat.id]);
    const roomIds = await unreadItemService.getRoomIdsMentioningUser(user2._id);
    assert.deepEqual(roomIds, [troupeId]);
  });

  it('should not notify when the user does not have access', async function() {
    const troupe = fixture.troupe2;
    const troupeId = troupe.id;
    const user3 = fixture.user3;

    let onUserMentionedInNonMemberRoom = 0;
    appEvents.onUserMentionedInNonMemberRoom(function(data) {
      if (String(data.userId) === String(user3.id)) {
        onUserMentionedInNonMemberRoom++;
      }
    });

    await chatService.newChatMessageToTroupe(troupe, fixture.user1, {
      text: 'Hey there @' + user3.username
    });
    // chatService doesn't wait for unreadItemService so we have to
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.strictEqual(onUserMentionedInNonMemberRoom, 0);
    const x = await unreadItemService.getUnreadItems(user3.id, troupeId);
    assert.deepEqual(x, []);
    const roomIds = await unreadItemService.getRoomIdsMentioningUser(user3._id);
    assert.deepEqual(roomIds, []);
  });
});
