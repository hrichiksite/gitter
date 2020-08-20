const mount = require('../../__test__/vuex-mount');
const momentTimezone = require('moment-timezone');
const {
  createSerializedMessageFixture,
  createSerializedRoomFixture
} = require('../../__test__/fixture-helpers');
const { default: ChatItem } = require('./chat-item.vue');

jest.mock('../../../components/unread-items-client');
jest.mock('../../../utils/is-mobile');
const unreadItemsClient = require('../../../components/unread-items-client');

describe('thread-message-feed chat-item', () => {
  momentTimezone.tz.setDefault('Europe/London');
  const message = createSerializedMessageFixture();
  const defaultProps = {
    message,
    useCompactStyles: false
  };
  const addRoomToStore = store => {
    const room = createSerializedRoomFixture('abc/def');
    store.state.roomMap = { [room.id]: room };
    store.state.displayedRoomId = room.id;
  };

  describe('snapshot', () => {
    it('with default props', () => {
      const { wrapper } = mount(ChatItem, defaultProps, addRoomToStore);
      expect(wrapper.element).toMatchSnapshot();
    });
    describe('component flags', () => {
      ['useCompactStyles', 'showItemActions'].forEach(flag => {
        it(flag, () => {
          const { wrapper } = mount(
            ChatItem,
            {
              ...defaultProps,
              [flag]: true
            },
            addRoomToStore
          );
          expect(wrapper.element).toMatchSnapshot();
        });
      });
    });
    describe('message flags', () => {
      ['error', 'loading', 'unread'].forEach(flag => {
        it(flag, () => {
          const { wrapper } = mount(
            ChatItem,
            {
              ...defaultProps,
              message: { ...message, [flag]: true }
            },
            addRoomToStore
          );
          expect(wrapper.element).toMatchSnapshot();
        });
      });
    });
    it('highlighted - scrolls into view', () => {
      const scrollIntoViewMock = jest.fn();
      const { wrapper } = mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, highlighted: true }
        },
        addRoomToStore,
        { methods: { scrollIntoView: scrollIntoViewMock } }
      );
      expect(wrapper.element).toMatchSnapshot();
      expect(scrollIntoViewMock.mock.calls[0]).toEqual(['smooth', 'center']);
    });
    it('deleted (empty) message', () => {
      const { wrapper } = mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, text: '', html: '' }
        },
        addRoomToStore
      );
      expect(wrapper.element).toMatchSnapshot();
    });
    it('not logged in user (no message actions)', () => {
      const { wrapper } = mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, text: '', html: '' }
        },
        store => {
          addRoomToStore(store);
          store.state.isLoggedIn = false;
        }
      );
      expect(wrapper.element).toMatchSnapshot();
    });
  });
  describe('editing', () => {
    let wrapper, stubbedActions;
    beforeEach(() => {
      const mountResult = mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, text: '', html: '' }
        },
        store => {
          addRoomToStore(store);
          store.state.threadMessageFeed = {
            messageEditState: {
              id: message.id,
              text: 'updated text'
            }
          };
        }
      );
      wrapper = mountResult.wrapper;
      stubbedActions = mountResult.stubbedActions;
    });

    it('matches snapshot', () => {
      expect(wrapper.element).toMatchSnapshot();
    });

    it('pressing enter submits the message for update', () => {
      wrapper.find({ ref: 'chatItemEditTextArea' }).trigger('keydown.enter');
      expect(stubbedActions.threadMessageFeed.updateMessage).toHaveBeenCalled();
    });
    it('pressing esc cancels editing', () => {
      wrapper.find({ ref: 'chatItemEditTextArea' }).trigger('keydown.esc');
      expect(stubbedActions.threadMessageFeed.cancelEdit).toHaveBeenCalled();
    });
  });
  it('focusedAt - scrolls into view', () => {
    const scrollIntoViewMock = jest.fn();
    mount(
      ChatItem,
      {
        ...defaultProps,
        message: { ...message, focusedAt: { block: 'start', timestamp: Date.now() } }
      },
      addRoomToStore,
      { methods: { scrollIntoView: scrollIntoViewMock } }
    );
    expect(scrollIntoViewMock.mock.calls[0]).toEqual(['auto', 'start']);
  });
  it('unread message reports itself as read when entering viewport', () => {
    const { wrapper } = mount(
      ChatItem,
      {
        ...defaultProps,
        message: { ...message, unread: true }
      },
      addRoomToStore
    );
    wrapper.vm.onViewportEnter();
    expect(unreadItemsClient.markItemRead.mock.calls[0]).toEqual([message.id]);
  });

  it('double tap triggers edit message action on mobile', () => {
    const { wrapper, stubbedActions } = mount(ChatItem, defaultProps, addRoomToStore);
    const isMobile = require('../../../utils/is-mobile');
    isMobile.mockImplementation(() => true);
    // avoiding calling the real action so we don't have to set up the store
    stubbedActions.threadMessageFeed.editMessage.mockImplementation(() => {});
    wrapper.find('.chat-item').trigger('touchend');
    wrapper.find('.chat-item').trigger('touchend');
    expect(stubbedActions.threadMessageFeed.editMessage).toHaveBeenCalledWith(
      expect.anything(),
      message,
      undefined
    );
  });
});
