'use strict';

const assert = require('assert');
const ChatItemPolicy = require('./chat-item-policy');

describe('ChatItemPolicy', () => {
  describe('canDelete', () => {
    const testAttributes = { id: '1', fromUser: { id: 'user1' } };

    it('can be deleted by message author', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, { currentUserId: 'user1' });
      assert(chatItemPolicy.canDelete());
    });

    it('can not be deleted by non author', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, { currentUserId: 'user2' });
      assert(!chatItemPolicy.canDelete());
    });

    it('can be deleted by troupe admin', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, {
        currentUserId: 'user2',
        isTroupeAdmin: true
      });
      assert(chatItemPolicy.canDelete());
    });
  });
  describe('isOwnMessage and canReport', () => {
    it('is own message when author matches current user - user cannot report it', () => {
      const chatItemPolicy = new ChatItemPolicy(
        { fromUser: { id: 'user1' } },
        { currentUserId: 'user1' }
      );
      assert(chatItemPolicy.isOwnMessage());
      assert(!chatItemPolicy.canReport());
    });
    it('is not own message when author differs from current user - user can report it', () => {
      const chatItemPolicy = new ChatItemPolicy(
        { fromUser: { id: 'user1' } },
        { currentUserId: 'user2' }
      );
      assert(!chatItemPolicy.isOwnMessage());
      assert(chatItemPolicy.canReport());
    });
  });
  describe('canEdit', () => {
    const minutesAgo = minutes => new Date(Date.now() - minutes * 60 * 1000);
    const testAttributes = {
      id: '1',
      text: 'hello',
      sent: minutesAgo(9),
      fromUser: { id: 'user1' }
    };
    it('can be edited by author when in the 10 minute period', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, { currentUserId: 'user1' });
      assert(chatItemPolicy.canEdit());
    });
    it('cannot be edited when outside of the edit period', () => {
      const chatItemPolicy = new ChatItemPolicy(
        { ...testAttributes, sent: minutesAgo(11) },
        { currentUserId: 'user1' }
      );
      assert(!chatItemPolicy.canEdit());
    });
    it('cannot be edited by other users', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, { currentUserId: 'user2' });
      assert(!chatItemPolicy.canEdit());
    });
    it('cannot edit "deleted" message', () => {
      const chatItemPolicy = new ChatItemPolicy(
        { ...testAttributes, text: '' },
        { currentUserId: 'user1' }
      );
      assert(!chatItemPolicy.canEdit());
    });
  });
});
