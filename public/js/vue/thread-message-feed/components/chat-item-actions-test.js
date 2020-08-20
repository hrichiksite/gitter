const mount = require('../../__test__/vuex-mount');
const { default: ChatItemActions } = require('./chat-item-actions.vue');
const {
  createSerializedMessageFixture,
  createSerializedRoomFixture
} = require('../../__test__/fixture-helpers');

describe('thread-message-feed chat-item-actions', () => {
  const message = createSerializedMessageFixture();

  const extendStore = (userId = message.fromUser.id, isAdmin) => store => {
    store.state.user = { id: userId };
    const room = createSerializedRoomFixture('uri/room', { permissions: { admin: isAdmin } });
    store.state.displayedRoomId = room.id;
    store.state.roomMap = { [room.id]: room };
  };

  it('clicking quote option triggers action', () => {
    const { wrapper, stubbedActions } = mount(ChatItemActions, { message }, extendStore());
    wrapper.find('.js-chat-item-quote-action').trigger('click');
    expect(stubbedActions.threadMessageFeed.quoteMessage).toHaveBeenCalled();
  });

  describe('user is not the author of the message', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(
        ChatItemActions,
        { message },
        extendStore('someOtherUserId-not-me')
      );
      expect(wrapper.element).toMatchSnapshot();
    });

    it('triggers report action if the report option is clicked', () => {
      const { wrapper, stubbedActions } = mount(
        ChatItemActions,
        { message },
        extendStore('someOtherUserId-not-me')
      );
      // removing the original implementation to prevent an API call
      stubbedActions.threadMessageFeed.reportMessage.mockImplementation(() => {});
      wrapper.find('.js-chat-item-report-action').trigger('click');
      expect(stubbedActions.threadMessageFeed.reportMessage).toHaveBeenCalled();
    });
  });

  describe('user can delete the message', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(ChatItemActions, { message }, extendStore());
      expect(wrapper.element).toMatchSnapshot();
    });

    it('recognises admin', () => {
      const { wrapper } = mount(
        ChatItemActions,
        { message: message },
        extendStore('someUserId', true)
      );
      expect(wrapper.find('.js-chat-item-delete-action').exists()).toEqual(true);
    });

    it('triggers delete action when delete option is clicked', () => {
      const { wrapper, stubbedActions } = mount(ChatItemActions, { message }, extendStore());
      // removing the original implementation to prevent an API call
      stubbedActions.threadMessageFeed.deleteMessage.mockImplementation(() => {});
      wrapper.find('.js-chat-item-delete-action').trigger('click');
      expect(stubbedActions.threadMessageFeed.deleteMessage).toHaveBeenCalled();
    });
  });

  describe('user can edit the message', () => {
    const testMessage = createSerializedMessageFixture({ sent: new Date().toISOString() });

    it('matches snapshot', () => {
      const { wrapper } = mount(
        ChatItemActions,
        { message: testMessage },
        extendStore(testMessage.fromUser.id)
      );
      expect(wrapper.element).toMatchSnapshot();
    });

    it('triggers edit action when edit option is clicked', () => {
      const { wrapper, stubbedActions } = mount(
        ChatItemActions,
        { message: testMessage },
        extendStore(testMessage.fromUser.id)
      );
      // removing the original implementation to prevent an API call
      stubbedActions.threadMessageFeed.editMessage.mockImplementation(() => {});
      wrapper.find('.js-chat-item-edit-action').trigger('click');
      expect(stubbedActions.threadMessageFeed.editMessage).toHaveBeenCalled();
    });
  });
});
