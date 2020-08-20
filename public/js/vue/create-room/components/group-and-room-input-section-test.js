const mount = require('../../__test__/vuex-mount');
const { default: GroupAndRoomInputSection } = require('./group-and-room-input-section.vue');

describe('GroupAndRoomInputSection', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(GroupAndRoomInputSection);
    expect(wrapper.element).toMatchSnapshot();
  });

  it('errors matches snapshot', () => {
    const { wrapper } = mount(GroupAndRoomInputSection, {}, store => {
      store.state.createRoom.groupError = 'group error';
      store.state.createRoom.roomNameError = 'room name error';
      store.state.createRoom.groupsRequest.error = new Error('groupsRequest error');
      store.state.createRoom.reposRequest.error = new Error('reposRequest error');
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('roomName', () => {
    it('Inputing new room name text fires store mutation', () => {
      const { wrapper, stubbedActions } = mount(GroupAndRoomInputSection);

      wrapper.find({ ref: 'roomNameInput' }).element.value = 'my-new-room';
      wrapper.find({ ref: 'roomNameInput' }).trigger('input');

      expect(stubbedActions.createRoom.setRoomName).toHaveBeenCalledWith(
        expect.anything(),
        'my-new-room',
        undefined
      );
    });
  });
});
