const mount = require('../../__test__/vuex-mount');
const { default: SecuritySelectSection } = require('./security-select-section.vue');
const { types } = require('../store');

describe('SecuritySelectSection', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(SecuritySelectSection);
    expect(wrapper.element).toMatchSnapshot();
  });

  it('clicking public radio fires store mutation', () => {
    const { wrapper, stubbedMutations } = mount(SecuritySelectSection, {}, store => {
      store.state.createRoom.roomSecurity = 'PRIVATE';
    });

    wrapper.find({ ref: 'publicSecurityRadio' }).trigger('click');

    expect(stubbedMutations.createRoom[types.SET_ROOM_SECURITY]).toHaveBeenCalledWith(
      expect.anything(),
      'PUBLIC'
    );
  });

  it('clicking private radio fires store mutation', () => {
    const { wrapper, stubbedMutations } = mount(SecuritySelectSection, {}, store => {
      store.state.createRoom.roomSecurity = 'PUBLIC';
    });

    wrapper.find({ ref: 'privateSecurityRadio' }).trigger('click');

    expect(stubbedMutations.createRoom[types.SET_ROOM_SECURITY]).toHaveBeenCalledWith(
      expect.anything(),
      'PRIVATE'
    );
  });
});
