const mount = require('../../__test__/vuex-mount');
const { default: CreateRoomExtraOptions } = require('./create-room-extra-options.vue');
const { types } = require('../store');

describe('CreateRoomExtraOptions', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(CreateRoomExtraOptions);
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('onlyGithubUsers', () => {
    it('visible when associated with public GitHub repo', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.selectedRepoId = 123;
        store.state.createRoom.adminRepoMap = {
          123: {
            type: 'GH_REPO'
          }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('not visible when no repo association', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.selectedRepoId = null;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('clicking onlyGitHubUsers checkbox fires store mutation', () => {
      const { wrapper, stubbedMutations } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.selectedRepoId = 123;
        store.state.createRoom.adminRepoMap = {
          123: {
            type: 'GH_REPO'
          }
        };
      });

      wrapper.find({ ref: 'onlyGitHubUsersCheckbox' }).trigger('click');

      expect(stubbedMutations.createRoom[types.SET_ONLY_GITHUB_USERS]).toHaveBeenCalledWith(
        expect.anything(),
        true
      );
    });
  });

  describe('allowGroupAdmins', () => {
    it('visible when private room with no repo association', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.roomSecurity = 'PRIVATE';
        store.state.createRoom.selectedRepoId = null;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('not visible when public room', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.roomSecurity = 'PUBLIC';
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('not visible when associated with GitHub repo', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.selectedRepoId = 123;
        store.state.createRoom.adminRepoMap = {
          123: {
            type: 'GH_REPO'
          }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('clicking allowGroupAdminsCheckbox checkbox fires store mutation', () => {
      const { wrapper, stubbedMutations } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.roomSecurity = 'PRIVATE';
        store.state.createRoom.selectedRepoId = null;
      });

      wrapper.find({ ref: 'allowGroupAdminsCheckbox' }).trigger('click');

      expect(stubbedMutations.createRoom[types.SET_ALLOW_GROUP_ADMINS]).toHaveBeenCalledWith(
        expect.anything(),
        true
      );
    });
  });

  describe('allowBadger', () => {
    it('visible when associated with public GitHub repo', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.selectedRepoId = 123;
        store.state.createRoom.adminRepoMap = {
          123: {
            type: 'GH_REPO'
          }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('not visible no repo association', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.selectedRepoId = null;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('not visible when repo is private', () => {
      const { wrapper } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.selectedRepoId = 123;
        store.state.createRoom.adminRepoMap = {
          123: {
            type: 'GH_REPO',
            private: true
          }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('clicking onlyGitHubUsers checkbox fires store mutation', () => {
      const { wrapper, stubbedMutations } = mount(CreateRoomExtraOptions, {}, store => {
        store.state.createRoom.allowBadger = false;
        store.state.createRoom.selectedRepoId = 123;
        store.state.createRoom.adminRepoMap = {
          123: {
            type: 'GH_REPO'
          }
        };
      });

      wrapper.find({ ref: 'allowBadgerCheckbox' }).trigger('click');

      expect(stubbedMutations.createRoom[types.SET_ALLOW_BADGER]).toHaveBeenCalledWith(
        expect.anything(),
        true
      );
    });
  });
});
