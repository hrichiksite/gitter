const mount = require('../../__test__/vuex-mount');
const { default: ListItem } = require('./list-item.vue');

const {
  createSerializedRoomFixture,
  createSerializedOneToOneRoomFixture
} = require('../../__test__/fixture-helpers');

describe('list-item', () => {
  it('community room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('my-community/community')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with short name matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('foo/bar')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with long name matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('abcdefghijklmnop/qrstuvwxyz')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('one to one room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedOneToOneRoomFixture('EricGitterTester')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('favourite room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        favourite: 1
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('active room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('my-community/room1'),
      active: true
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with unread matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        unreadItems: 7
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with mentions matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        mentions: 7
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('muted room with activity matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        lurk: true,
        activity: true
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('favourite loading room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        favourite: 1,
        loading: true
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "changeDisplayedRoomById" and "toggleLeftMenu" when item is clicked', () => {
    const room = createSerializedRoomFixture('my-community/community');
    const { wrapper, stubbedActions } = mount(ListItem, {
      item: room
    });

    wrapper.find({ ref: 'link' }).trigger('click');

    expect(stubbedActions.changeDisplayedRoomById).toHaveBeenCalledWith(
      expect.anything(),
      room.id,
      undefined
    );

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(expect.anything(), false, undefined);
  });
});
