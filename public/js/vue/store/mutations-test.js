const createState = require('./state').default;
const types = require('./mutation-types');
const mutations = require('./mutations').default;
const {
  roomSearchRepoRequest,
  roomSearchRoomRequest,
  roomSearchPeopleRequest,
  messageSearchRequest
} = require('../../../../public/js/vue/store/requests');

const { createSerializedRoomFixture } = require('../__test__/fixture-helpers');

describe('mutations', () => {
  let state;
  beforeEach(() => {
    state = createState();
  });

  it('SET_INITIAL_DATA adds/updates all keys in payload', () => {
    mutations[types.SET_INITIAL_DATA](state, { a: 1, b: 2 });
    expect(state.a).toEqual(1);
    expect(state.b).toEqual(2);
  });

  it('TOGGLE_DARK_THEME', () => {
    const newValue = true;
    mutations[types.TOGGLE_DARK_THEME](state, newValue);
    expect(state.darkTheme).toEqual(newValue);
  });

  it('SWITCH_LEFT_MENU_STATE', () => {
    const newValue = 'newTestValue';
    mutations[types.SWITCH_LEFT_MENU_STATE](state, newValue);
    expect(state.leftMenuState).toEqual(newValue);
  });

  describe('TOGGLE_LEFT_MENU_PINNED_STATE', () => {
    it('unpinning left menu will collapse menu', () => {
      state.leftMenuPinnedState = true;
      state.leftMenuExpandedState = true;
      expect(state.leftMenuPinnedState).toEqual(true);
      expect(state.leftMenuExpandedState).toEqual(true);

      mutations[types.TOGGLE_LEFT_MENU_PINNED_STATE](state, false);

      expect(state.leftMenuPinnedState).toEqual(false);
      expect(state.leftMenuExpandedState).toEqual(false);
    });

    it('pinning left menu', () => {
      state.leftMenuPinnedState = false;
      state.leftMenuExpandedState = false;
      expect(state.leftMenuPinnedState).toEqual(false);
      expect(state.leftMenuExpandedState).toEqual(false);

      mutations[types.TOGGLE_LEFT_MENU_PINNED_STATE](state, true);

      expect(state.leftMenuPinnedState).toEqual(true);
      expect(state.leftMenuExpandedState).toEqual(false);
    });
  });

  describe('TOGGLE_LEFT_MENU', () => {
    it('collapsing left menu', () => {
      state.leftMenuExpandedState = true;
      expect(state.leftMenuExpandedState).toEqual(true);

      mutations[types.TOGGLE_LEFT_MENU](state, false);

      expect(state.leftMenuExpandedState).toEqual(false);
    });

    it('expanding left menu', () => {
      state.leftMenuExpandedState = false;
      expect(state.leftMenuExpandedState).toEqual(false);

      mutations[types.TOGGLE_LEFT_MENU](state, true);

      expect(state.leftMenuExpandedState).toEqual(true);
    });
  });

  it('UPDATE_FAVOURITE_DRAGGING_STATE', () => {
    const newValue = true;
    mutations[types.UPDATE_FAVOURITE_DRAGGING_STATE](state, newValue);
    expect(state.favouriteDraggingInProgress).toEqual(newValue);
  });

  describe('REQUEST_ROOM_FAVOURITE', () => {
    it('sets loading state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: room1
      };

      mutations[types.REQUEST_ROOM_FAVOURITE](state, room1.id);
      expect(state.roomMap[room1.id].loading).toEqual(true);
    });

    it('clears error state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: { ...room1, error: true }
      };

      expect(state.roomMap[room1.id].error).toEqual(true);

      mutations[types.REQUEST_ROOM_FAVOURITE](state, room1.id);
      expect(state.roomMap[room1.id].error).toEqual(false);
    });
  });

  describe('RECEIVE_ROOM_FAVOURITE_SUCCESS', () => {
    it('clears loading state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: { ...room1, loading: true }
      };

      expect(state.roomMap[room1.id].loading).toEqual(true);

      mutations[types.RECEIVE_ROOM_FAVOURITE_SUCCESS](state, room1.id);
      expect(state.roomMap[room1.id].loading).toEqual(false);
    });

    it('clears error state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: { ...room1, error: true }
      };

      expect(state.roomMap[room1.id].error).toEqual(true);

      mutations[types.RECEIVE_ROOM_FAVOURITE_SUCCESS](state, room1.id);
      expect(state.roomMap[room1.id].error).toEqual(false);
    });
  });

  it('RECEIVE_ROOM_FAVOURITE_ERROR ', () => {
    const room1 = createSerializedRoomFixture('community/room1');
    state.roomMap = {
      [room1.id]: { ...room1, loading: true }
    };

    expect(state.roomMap[room1.id].loading).toEqual(true);

    mutations[types.RECEIVE_ROOM_FAVOURITE_ERROR](state, { id: room1.id, error: true });
    expect(state.roomMap[room1.id].loading).toEqual(false);
    expect(state.roomMap[room1.id].error).toEqual(true);
  });

  describe('Search', () => {
    it('UPDATE_SEARCH_INPUT_VALUE', () => {
      const newValue = 'newTestValue';
      mutations[types.UPDATE_SEARCH_INPUT_VALUE](state, newValue);
      expect(state.search.searchInputValue).toEqual(newValue);
    });

    it('SEARCH_CLEARED', () => {
      state.search.current = { results: [123] };
      state.search.repo = { loading: true, error: true, results: [123] };
      state.search.room = { loading: true, error: true, results: [123] };
      state.search.people = { loading: true, error: true, results: [123] };
      state.search.message = { loading: true, error: true, results: [123] };

      mutations[types.SEARCH_CLEARED](state);
      expect(state.search.current.results).toEqual([]);

      expect(state.search.repo).toEqual({ loading: false, error: false, results: [] });
      expect(state.search.room).toEqual({ loading: false, error: false, results: [] });
      expect(state.search.people).toEqual({ loading: false, error: false, results: [] });
      expect(state.search.message).toEqual({ loading: false, error: false, results: [] });
    });

    describe('Room search', () => {
      describe('UPDATE_ROOM_SEARCH_CURRENT', () => {
        it('searching nothing, finds nothing', () => {
          state.search.searchInputValue = '';

          const room1 = createSerializedRoomFixture('community/special-room1');
          state.roomMap = {
            [room1.id]: room1
          };

          mutations[types.UPDATE_ROOM_SEARCH_CURRENT](state);
          expect(state.search.current.results).toEqual([]);
        });

        it('searching for room, finds room', () => {
          state.search.searchInputValue = 'special';

          const room1 = createSerializedRoomFixture('community/special-room1');
          state.roomMap = {
            [room1.id]: room1
          };

          mutations[types.UPDATE_ROOM_SEARCH_CURRENT](state);
          expect(state.search.current.results).toEqual([room1.id]);
        });

        it('searching for some other room not in your list, finds nothing', () => {
          state.search.searchInputValue = 'not-in-my-room-list';

          const room1 = createSerializedRoomFixture('community/special-room1');
          state.roomMap = {
            [room1.id]: room1
          };

          mutations[types.UPDATE_ROOM_SEARCH_CURRENT](state);
          expect(state.search.current.results).toEqual([]);
        });
      });

      it('is integrated with roomSearchRepoRequest', () => {
        mutations[roomSearchRepoRequest.successType](state, ['result']);
        expect(state.search.repo.results).toEqual(['result']);
      });

      it('is integrated with roomSearchRoomRequest', () => {
        mutations[roomSearchRoomRequest.successType](state, ['result']);
        expect(state.search.room.results).toEqual(['result']);
      });

      it('is integrated with roomSearchPeopleRequest', () => {
        mutations[roomSearchPeopleRequest.successType](state, ['result']);
        expect(state.search.people.results).toEqual(['result']);
      });
    });

    describe('Message search', () => {
      it('is integrated with messageSearchRequest', () => {
        mutations[messageSearchRequest.successType](state, ['result']);
        expect(state.search.message.results).toEqual(['result']);
      });
    });
  });

  describe('CHANGE_DISPLAYED_ROOM', () => {
    it('changed displayed room', () => {
      const newRoomId = '123456';
      mutations[types.CHANGE_DISPLAYED_ROOM](state, newRoomId);
      expect(state.displayedRoomId).toEqual(newRoomId);
    });

    it('clears highlighted message', () => {
      const messageId = '5c1234';
      state.hightLightedMessageId = messageId;
      expect(state.hightLightedMessageId).toBeDefined();

      mutations[types.CHANGE_DISPLAYED_ROOM](state, '123456');
      expect(state.hightLightedMessageId).toEqual(null);
    });
  });

  it('CHANGE_HIGHLIGHTED_MESSAGE_ID', () => {
    const newMessageId = '5c1234';
    mutations[types.CHANGE_HIGHLIGHTED_MESSAGE_ID](state, newMessageId);
    expect(state.hightLightedMessageId).toEqual(newMessageId);
  });

  describe('UPDATE_ROOM', () => {
    it('adds new room to the roomMap', () => {
      const roomObject = {
        id: 123,
        uri: 'foo/bar'
      };
      mutations[types.UPDATE_ROOM](state, roomObject);
      expect(state.roomMap[123]).toEqual(roomObject);
    });

    it('updates existing room in roomMap', () => {
      const roomObject = {
        id: 123,
        uri: 'foo/bar',
        unreads: 4
      };

      state.roomMap[roomObject.id] = roomObject;

      const newRoomObject = {
        ...roomObject,
        unreads: 10
      };

      mutations[types.UPDATE_ROOM](state, newRoomObject);
      expect(state.roomMap[123]).toEqual(newRoomObject);
    });
  });

  it('ADD_TO_MESSAGE_MAP should add payload messages to the messageMap', () => {
    const message1 = { id: '5cf8ef111111111111111111' };
    const message2 = { id: '5cf8ef222222222222222222' };
    state.messageMap = { [message1.id]: message1 };
    mutations[types.ADD_TO_MESSAGE_MAP](state, [message2]);
    expect(state.messageMap).toEqual({ [message1.id]: message1, [message2.id]: message2 });
  });

  it('ADD_TO_MESSAGE_MAP should remove temporary messages', () => {
    const tmpMessage = {
      id: `tmp-5cf8ef111111111111111111-userId-hello`
    };
    const message1 = {
      id: '5cf8ef22222222222222222',
      parentId: '5cf8ef111111111111111111',
      fromUser: { id: 'userId' },
      text: 'hello'
    };
    const payload = [message1];
    state.messageMap = { [tmpMessage.id]: tmpMessage };
    state.user = { id: 'userId' };
    mutations[types.ADD_TO_MESSAGE_MAP](state, payload);
    expect(state.messageMap).toEqual({ [message1.id]: message1 });
  });

  it('REMOVE_MESSAGE', () => {
    const message1 = { id: '5cf8ef111111111111111111' };
    state.messageMap = { [message1.id]: message1 };
    mutations[types.REMOVE_MESSAGE](state, { id: message1.id });
    expect(state.messageMap).toEqual({});
  });

  it('UPDATE_MESSAGE', () => {
    const message1 = { id: '5cf8ef111111111111111111' };
    state.messageMap = { [message1.id]: message1 };
    mutations[types.UPDATE_MESSAGE](state, { id: message1.id, highlighted: true });
    expect(state.messageMap[message1.id].highlighted).toEqual(true);
  });
});
