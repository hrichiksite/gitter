const mount = require('../../__test__/vuex-mount');
const leftMenuConstants = require('../constants');
const { default: MenuBarItem } = require('./menu-bar-item.vue');

describe('menu-bar-item', () => {
  it('matches snapshot with required properties', () => {
    const { wrapper } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('matches snapshot with all properties', () => {
    const { wrapper } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_ALL_STATE,
      label: 'all',
      class: 'item-all',
      hasUnreads: true,
      hasMentions: true
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "setLeftMenuState" when item is clicked', () => {
    const { wrapper, stubbedActions } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_ALL_STATE
    });

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.setLeftMenuState).toHaveBeenCalledWith(
      expect.anything(),
      leftMenuConstants.LEFT_MENU_ALL_STATE,
      undefined
    );
  });

  it('calls store action "toggleLeftMenu" with toggled state when active item is clicked', () => {
    const beforeExpandedState = true;
    const { wrapper, stubbedActions } = mount(
      MenuBarItem,
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_ALL_STATE;
        store.state.leftMenuExpandedState = beforeExpandedState;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(
      expect.anything(),
      !beforeExpandedState,
      undefined
    );
  });

  it('calls store action "toggleLeftMenu" with expanded state when new item is clicked', () => {
    const { wrapper, stubbedActions } = mount(
      MenuBarItem,
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_SEARCH_STATE;
        store.state.leftMenuExpandedState = false;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(expect.anything(), true, undefined);
  });
});
