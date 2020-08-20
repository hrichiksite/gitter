const mount = require('../../__test__/vuex-mount');
const { default: SearchBody } = require('./search-body.vue');

const {
  createSerializedRoomFixture,
  createSerializedMessageSearchResultFixture
} = require('../../__test__/fixture-helpers');

const ROOM_SEARCH_RESULT_ROOM1 = createSerializedRoomFixture('community/room1');
const ROOM_SEARCH_RESULT_ROOM2 = createSerializedRoomFixture('community/room2');
const ROOM_SEARCH_ROOM_MAP_FIXTURE = {
  [ROOM_SEARCH_RESULT_ROOM1.id]: ROOM_SEARCH_RESULT_ROOM1,
  [ROOM_SEARCH_RESULT_ROOM2.id]: ROOM_SEARCH_RESULT_ROOM2
};
const ROOM_SEARCH_RESULT_FIXTURE = [ROOM_SEARCH_RESULT_ROOM1.id, ROOM_SEARCH_RESULT_ROOM2.id];

const MESSAGE_SEARCH_RESULT_FIXTURE = [
  createSerializedMessageSearchResultFixture(),
  createSerializedMessageSearchResultFixture()
];

describe('search-body', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(SearchBody);
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search repo loading matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.repo.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search repo error matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.repo.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search repo results matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.roomMap = ROOM_SEARCH_ROOM_MAP_FIXTURE;
      store.state.search.repo.results = ROOM_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search room loading matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.room.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search room error matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.room.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search room results matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.roomMap = ROOM_SEARCH_ROOM_MAP_FIXTURE;

      store.state.search.room.results = ROOM_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search people loading matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.people.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search people error matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.people.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search people results matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.roomMap = ROOM_SEARCH_ROOM_MAP_FIXTURE;

      store.state.search.people.results = ROOM_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search combined results matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      const repo1 = createSerializedRoomFixture('community/repo1');
      const room1 = createSerializedRoomFixture('community/room1');
      const person1 = createSerializedRoomFixture('person1');

      store.state.roomMap = {
        [repo1.id]: repo1,
        [room1.id]: room1,
        [person1.id]: person1
      };

      store.state.search.repo.results = [repo1.id];
      store.state.search.room.results = [room1.id];
      store.state.search.people.results = [person1.id];
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('deduplicates room search combined results matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      const room1 = createSerializedRoomFixture('community/repo1');

      store.state.roomMap = {
        [room1.id]: room1
      };

      store.state.search.current.results = [room1.id];
      store.state.search.repo.results = [room1.id];
      store.state.search.room.results = [room1.id];
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('message search loading matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.message.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('message search error matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.message.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('message search results matches snapshot', () => {
    const { wrapper } = mount(SearchBody, {}, store => {
      store.state.search.message.results = MESSAGE_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "fetchRoomSearchResults" and "fetchMessageSearchResults" after inputting', () => {
    const searchValue = 'needtofindthisthing';
    const { wrapper, stubbedActions } = mount(SearchBody, { searchImmediately: true }, store => {
      store.state.search.searchInputValue = searchValue;
    });

    wrapper.find({ ref: 'search-input' }).trigger('input');

    expect(stubbedActions.fetchRoomSearchResults).toHaveBeenCalled();
    expect(stubbedActions.fetchMessageSearchResults).toHaveBeenCalled();
  });
});
