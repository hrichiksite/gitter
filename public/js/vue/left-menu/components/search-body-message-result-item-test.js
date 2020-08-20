const mount = require('../../__test__/vuex-mount');
const { default: SearchBodyMessageResultItem } = require('./search-body-message-result-item.vue');

const {
  createSerializedRoomFixture,
  createSerializedMessageSearchResultFixture
} = require('../../__test__/fixture-helpers');

describe('search-body-message-result-item', () => {
  // So the dates look the same wherever you actually are
  require('moment-timezone').tz.setDefault('America/Los_Angeles');

  it('matches snapshot', () => {
    const messageSearchResult = createSerializedMessageSearchResultFixture();
    const { wrapper } = mount(SearchBodyMessageResultItem, { messageSearchResult }, store => {
      const room1 = createSerializedRoomFixture('community/room1');
      store.state.roomMap = {
        [room1.id]: room1
      };
      store.state.displayedRoomId = room1.id;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "jumpToMessageId" after clicking result', () => {
    const messageSearchResult = createSerializedMessageSearchResultFixture();
    const { wrapper, stubbedActions } = mount(
      SearchBodyMessageResultItem,
      {
        messageSearchResult
      },
      store => {
        const room1 = createSerializedRoomFixture('community/room1');
        store.state.roomMap = {
          [room1.id]: room1
        };
        store.state.displayedRoomId = room1.id;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.jumpToMessageId).toHaveBeenCalled();
  });
});
