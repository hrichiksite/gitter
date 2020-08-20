const mount = require('../../__test__/vuex-mount');
const { default: StepBackingEntity } = require('./step-backing-entity.vue');

import {
  CREATE_COMMUNITY_STEP_MAIN,
  CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE,
  CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE
} from '../constants';

const DEFAULT_PROPS = {
  orgName: 'orgs',
  orgList: [],
  repoName: 'repos',
  repoList: []
};

describe('StepBackingEntity', () => {
  it('orgs tab matches snapshot', () => {
    const { wrapper } = mount(StepBackingEntity, DEFAULT_PROPS, store => {
      store.state.createCommunity.entityTypeTabState = CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('repos tab matches snapshot', () => {
    const { wrapper } = mount(StepBackingEntity, DEFAULT_PROPS, store => {
      store.state.createCommunity.entityTypeTabState = CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('click tabs', () => {
    it('should switch to org tab when you click on it', () => {
      const { wrapper, stubbedActions } = mount(StepBackingEntity, DEFAULT_PROPS, store => {
        store.state.createCommunity.entityTypeTabState = CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE;
      });
      wrapper.find({ ref: 'orgTabButton' }).trigger('click');

      expect(stubbedActions.createCommunity.setEntityTypeTabState).toHaveBeenCalledWith(
        expect.anything(),
        CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE,
        undefined
      );
    });

    it('should switch to repo tab when you click on it', () => {
      const { wrapper, stubbedActions } = mount(StepBackingEntity, DEFAULT_PROPS, store => {
        store.state.createCommunity.entityTypeTabState = CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE;
      });
      wrapper.find({ ref: 'repoTabButton' }).trigger('click');

      expect(stubbedActions.createCommunity.setEntityTypeTabState).toHaveBeenCalledWith(
        expect.anything(),
        CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE,
        undefined
      );
    });
  });

  it('should go back to main view with back button clicked', () => {
    const { wrapper, stubbedActions } = mount(StepBackingEntity, DEFAULT_PROPS);
    wrapper.find({ ref: 'backButton' }).trigger('click');

    expect(stubbedActions.createCommunity.moveToStep).toHaveBeenCalledWith(
      expect.anything(),
      CREATE_COMMUNITY_STEP_MAIN,
      undefined
    );
  });
});
