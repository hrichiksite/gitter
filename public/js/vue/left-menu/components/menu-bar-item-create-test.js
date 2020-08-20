const mount = require('../../__test__/vuex-mount');
const { default: MenuBarItemCreate } = require('./menu-bar-item-create.vue');

describe('menu-bar-item-create', () => {
  it('create matches snapshot', () => {
    const { wrapper } = mount(MenuBarItemCreate, {
      type: 'create'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('opens popover when item is clicked', () => {
    const { wrapper } = mount(MenuBarItemCreate, {
      type: 'create'
    });

    expect(wrapper.vm.popover).toEqual(undefined);

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(wrapper.vm.popover).toBeDefined();
  });
});
