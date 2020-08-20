const mount = require('../../__test__/vuex-mount');
const { default: JoinOrSignInButton } = require('./join-or-sign-in-button.vue');
const {
  createSerializedRoomFixture,
  createSerializedUserFixture
} = require('../../__test__/fixture-helpers');

describe('thread-message-feed join-or-sign-in-button', () => {
  const addRoomAndUserToStore = (githubOnlyRoom = false) => store => {
    store.state.isLoggedIn = true;
    store.state.user = createSerializedUserFixture({ providers: ['gitlab'] });
    const providers = githubOnlyRoom ? { providers: ['github'] } : {};
    const room = createSerializedRoomFixture('test', { ...providers, roomMember: false });
    store.state.displayedRoomId = room.id;
    store.state.roomMap = { [room.id]: room };
  };

  describe('user allowed to join room', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(JoinOrSignInButton, {}, addRoomAndUserToStore());
      expect(wrapper.element).toMatchSnapshot();
    });

    it('matches snapshot when loading', () => {
      const { wrapper } = mount(JoinOrSignInButton, {}, store => {
        addRoomAndUserToStore()(store);
        store.state.joinRoomRequest = { loading: true, error: false };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('matches snapshot when request failed', () => {
      const { wrapper } = mount(JoinOrSignInButton, {}, store => {
        addRoomAndUserToStore()(store);
        store.state.joinRoomRequest = {
          loading: false,
          error: new Error('Internal Server Error')
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('joinRoom action called on click', () => {
      const { wrapper, stubbedActions } = mount(JoinOrSignInButton, {}, addRoomAndUserToStore());
      wrapper.find('.chat-input__btn').trigger('click');

      expect(stubbedActions.joinRoom).toHaveBeenCalledWith(expect.anything(), undefined, undefined);
    });
  });

  it('user not allowed to join - matches snapshot', () => {
    const { wrapper } = mount(JoinOrSignInButton, {}, addRoomAndUserToStore(true));
    expect(wrapper.element).toMatchSnapshot();
  });

  it('shows sign in button for nli users', () => {
    const { wrapper } = mount(JoinOrSignInButton, {}, store => {
      store.state.isLoggedIn = false;
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
