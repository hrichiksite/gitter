const mount = require('../../__test__/vuex-mount');
jest.mock('./announcements-body.vue');
const announcementsBody = require('./announcements-body.vue');

const { default: MenuBarBody } = require('./menu-bar-body.vue');

describe('menu-bar-body', () => {
  beforeAll(() => {
    announcementsBody.isAnnouncementActive.mockImplementation(() => true);
  });

  it('matches snapshot when pinned', () => {
    const { wrapper } = mount(MenuBarBody, {}, store => {
      store.state.leftMenuPinnedState = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('matches snapshot when unpinned', () => {
    const { wrapper } = mount(MenuBarBody, {}, store => {
      store.state.leftMenuPinnedState = false;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('unreads', () => {
    it('matches snapshot when unreads', () => {
      const { wrapper } = mount(MenuBarBody, {}, store => {
        store.state.roomMap = {
          1: { id: 1, unreadItems: 6 }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('matches snapshot when one to one unreads', () => {
      const { wrapper } = mount(MenuBarBody, {}, store => {
        store.state.roomMap = {
          1: { id: 1, oneToOne: true, unreadItems: 6 }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('matches snapshot when mentions', () => {
      const { wrapper } = mount(MenuBarBody, {}, store => {
        store.state.roomMap = {
          1: { id: 1, mentions: true }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });
});
