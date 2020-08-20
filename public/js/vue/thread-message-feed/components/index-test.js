const mount = require('../../__test__/vuex-mount');
const {
  createSerializedMessageFixture,
  createSerializedRoomFixture
} = require('../../__test__/fixture-helpers');
const { default: Index } = require('./index.vue');

describe('thread-message-feed', () => {
  const addDisplayedRoom = (state, roomMember = true) => {
    const displayedRoom = createSerializedRoomFixture({ roomMember });
    state.roomMap = { [displayedRoom.id]: displayedRoom };
    state.displayedRoomId = displayedRoom.id;
  };
  const addDefaultUser = state => {
    state.user = { displayName: 'John Smith' };
  };
  const addParentMessage = state => {
    const parentMessage = createSerializedMessageFixture();
    state.messageMap = { [parentMessage.id]: parentMessage };
    state.threadMessageFeed.parentId = parentMessage.id;
  };
  const setupDefaultState = state => {
    addDisplayedRoom(state);
    addDefaultUser(state);
    addParentMessage(state);
  };

  it('closed - matches snapshot', async () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.threadMessageFeed.isVisible = false;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('not room member - matches snapshot', async () => {
    const { wrapper } = mount(Index, {}, store => {
      addParentMessage(store.state);
      addDisplayedRoom(store.state, false);
      store.state.threadMessageFeed.isVisible = true;
      const parentId = store.state.threadMessageFeed.parentId;
      store.state.messageMap = {
        ...store.state.messageMap,
        1: createSerializedMessageFixture({ id: '1', parentId }),
        2: createSerializedMessageFixture({ id: '2', parentId })
      };
      store.state.roomMap[store.state.displayedRoomId].roomMember = false;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('child messages', () => {
    it('opened - matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        setupDefaultState(store.state);
        store.state.threadMessageFeed.isVisible = true;
        const parentId = store.state.threadMessageFeed.parentId;
        store.state.messageMap = {
          ...store.state.messageMap,
          1: createSerializedMessageFixture({ id: '1', parentId }),
          2: createSerializedMessageFixture({ id: '2', parentId })
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('loading - matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        setupDefaultState(store.state);
        store.state.threadMessageFeed.isVisible = true;
        store.state.threadMessageFeed.childMessagesRequest.loading = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('error - matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        setupDefaultState(store.state);
        store.state.threadMessageFeed.isVisible = true;
        store.state.threadMessageFeed.childMessagesRequest.error = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  it('dark theme - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      setupDefaultState(store.state);
      store.state.threadMessageFeed.isVisible = true;
      store.state.darkTheme = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('missing parent message - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      setupDefaultState(store.state);
      store.state.threadMessageFeed.isVisible = true;
      store.state.messageMap = {};
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
