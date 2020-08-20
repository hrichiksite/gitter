const mount = require('../../__test__/vuex-mount');
const {
  createOrgGitlabGroupFixture,
  createOrgGithubOrgFixture,
  createRepoGithubRepoFixture
} = require('../../__test__/fixture-helpers');
const { default: EntityList } = require('./entity-list.vue');

import { CREATE_COMMUNITY_STEP_MAIN } from '../constants';

describe('EntityList', () => {
  it('empty list matches snapshot', () => {
    const { wrapper } = mount(
      EntityList,
      {
        displayName: 'orgs',
        list: [],
        loading: false,
        error: null
      },
      store => {
        store.state.createCommunity.selectedBackingEntity = null;
      }
    );

    expect(wrapper.element).toMatchSnapshot();
  });

  it('loading matches snapshot', () => {
    const { wrapper } = mount(
      EntityList,
      {
        displayName: 'orgs',
        list: [],
        loading: true,
        error: null
      },
      store => {
        store.state.createCommunity.selectedBackingEntity = null;
      }
    );

    expect(wrapper.element).toMatchSnapshot();
  });

  it('error matches snapshot', () => {
    const { wrapper } = mount(
      EntityList,
      {
        displayName: 'orgs',
        list: [],
        loading: false,
        error: new Error('my fake error')
      },
      store => {
        store.state.createCommunity.selectedBackingEntity = null;
      }
    );

    expect(wrapper.element).toMatchSnapshot();
  });

  it('GitLab group list matches snapshot', () => {
    const { wrapper } = mount(
      EntityList,
      {
        displayName: 'orgs',
        list: [
          createOrgGitlabGroupFixture('gitlab-org/gitter'),
          createOrgGitlabGroupFixture('gitlab-org')
        ],
        loading: false,
        error: null
      },
      store => {
        store.state.createCommunity.selectedBackingEntity = null;
      }
    );

    expect(wrapper.element).toMatchSnapshot();
  });

  it('GitHub org list matches snapshot', () => {
    const { wrapper } = mount(
      EntityList,
      {
        displayName: 'orgs',
        list: [createOrgGithubOrgFixture('gitlabhq'), createOrgGithubOrgFixture('gitterHQ')],
        loading: false,
        error: null
      },
      store => {
        store.state.createCommunity.selectedBackingEntity = null;
      }
    );

    expect(wrapper.element).toMatchSnapshot();
  });

  it('GitHub repo list matches snapshot', () => {
    const { wrapper } = mount(
      EntityList,
      {
        displayName: 'orgs',
        list: [
          createRepoGithubRepoFixture('gitterHQ/gitter'),
          createRepoGithubRepoFixture('gitlabhq/gitlabhq')
        ],
        loading: false,
        error: null
      },
      store => {
        store.state.createCommunity.selectedBackingEntity = null;
      }
    );

    expect(wrapper.element).toMatchSnapshot();
  });

  describe('clicking item', () => {
    it('clicking entity selects the entity', () => {
      const org = createOrgGithubOrgFixture('gitterHQ');
      const { wrapper, stubbedActions } = mount(
        EntityList,
        {
          displayName: 'orgs',
          list: [org],
          loading: false,
          error: null
        },
        store => {
          store.state.createCommunity.selectedBackingEntity = null;
        }
      );

      wrapper.find('.entity-list-item-link').trigger('click');

      expect(stubbedActions.createCommunity.setSelectedBackingEntity).toHaveBeenCalledWith(
        expect.anything(),
        org,
        undefined
      );

      expect(stubbedActions.createCommunity.moveToStep).toHaveBeenCalledWith(
        expect.anything(),
        CREATE_COMMUNITY_STEP_MAIN,
        undefined
      );
    });

    it('clicking already selected entity deselects that entity', () => {
      const org = createOrgGithubOrgFixture('gitterHQ');
      const { wrapper, stubbedActions } = mount(
        EntityList,
        {
          displayName: 'orgs',
          list: [org],
          loading: false,
          error: null
        },
        store => {
          store.state.createCommunity.selectedBackingEntity = org;
        }
      );

      wrapper.find('.entity-list-item-link').trigger('click');

      expect(stubbedActions.createCommunity.setSelectedBackingEntity).toHaveBeenCalledWith(
        expect.anything(),
        null,
        undefined
      );

      expect(stubbedActions.createCommunity.moveToStep).toHaveBeenCalledWith(
        expect.anything(),
        CREATE_COMMUNITY_STEP_MAIN,
        undefined
      );
    });
  });
});
