const leftMenuConstants = require('../constants');
const mount = require('../../__test__/vuex-mount');
const { default: MenuBarItemToggle } = require('./menu-bar-item-toggle.vue');

jest.mock('../../../utils/is-mobile-breakpoint');
const isMobileBreakpoint = require('../../../utils/is-mobile-breakpoint');

describe('menu-bar-item-toggle', () => {
  it('toggle matches snapshot', () => {
    const { wrapper } = mount(MenuBarItemToggle, {
      type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('On desktop, calls store action "toggleLeftMenuPinnedState" when item is clicked', () => {
    // Set as desktop
    isMobileBreakpoint.mockImplementation(() => false);

    const beforePinnedState = false;
    const { wrapper, stubbedActions } = mount(
      MenuBarItemToggle,
      {
        type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
      },
      store => {
        store.state.leftMenuPinnedState = beforePinnedState;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenuPinnedState).toHaveBeenCalledWith(
      expect.anything(),
      !beforePinnedState,
      undefined
    );
  });

  it('On mobile, calls store action "toggleLeftMenu" when item is clicked', () => {
    // Set as mobile
    isMobileBreakpoint.mockImplementation(() => true);

    const beforeExpandedState = false;
    const { wrapper, stubbedActions } = mount(
      MenuBarItemToggle,
      {
        type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
      },
      store => {
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
});
