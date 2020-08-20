process.env.TEST_FRIENDLY_DEBOUNCE = '1';

jest.mock('../../../utils/appevents');
jest.mock('../../../components/api-client');

const testAction = require('../../store/__test__/vuex-action-helper');
const appEvents = require('../../../utils/appevents');
const apiClient = require('../../../components/api-client');

const {
  default: { actions, mutations, getters },
  types,
  orgsVuexRequest,
  reposVuexRequest,
  communitySubmitVuexRequest
} = require('.');

import {
  CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB,
  CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE,
  slugAvailabilityStatusConstants
} from '../constants';

const {
  createOrgGitlabGroupFixture,
  createRepoGitlabProjectFixture,
  createOrgGithubOrgFixture,
  createRepoGithubRepoFixture
} = require('../../__test__/fixture-helpers');

describe('create community store', () => {
  beforeEach(() => {
    appEvents.trigger.mockReset();
    apiClient.user.get.mockReset();
    apiClient.priv.get.mockReset();
    apiClient.post.mockReset();
  });

  describe('mutations', () => {
    it('MOVE_TO_STEP sets step', () => {
      const state = {};
      mutations[types.MOVE_TO_STEP](state, CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB);
      expect(state.currentStep).toEqual(CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB);
    });

    it('SET_COMMUNITY_NAME sets community name', () => {
      const state = {};
      const newName = 'foobarbaz';
      mutations[types.SET_COMMUNITY_NAME](state, newName);
      expect(state.communityName).toEqual(newName);
    });

    it('SET_COMMUNITY_NAME_ERROR sets community name error', () => {
      const state = {};
      const errorString = 'some ERROR string';
      mutations[types.SET_COMMUNITY_NAME_ERROR](state, errorString);
      expect(state.communityNameError).toEqual(errorString);
    });

    it('SET_COMMUNITY_SLUG sets community slug', () => {
      const state = {};
      const newSlug = 'foo-bar-baz';
      mutations[types.SET_COMMUNITY_SLUG](state, newSlug);
      expect(state.communitySlug).toEqual(newSlug);
    });

    it('SET_SLUG_AVAILABILITY_STATUS sets community slug availability', () => {
      const state = {};
      mutations[types.SET_SLUG_AVAILABILITY_STATUS](
        state,
        slugAvailabilityStatusConstants.GITHUB_CLASH
      );
      expect(state.slugAvailabilityStatus).toEqual(slugAvailabilityStatusConstants.GITHUB_CLASH);
    });

    it('SET_COMMUNITY_SLUG_ERROR sets community slug error', () => {
      const state = {};
      const errorString = 'some ERROR string';
      mutations[types.SET_COMMUNITY_SLUG_ERROR](state, errorString);
      expect(state.communitySlugError).toEqual(errorString);
    });

    it('SET_SELECTED_BACKING_ENTITY sets community slug error', () => {
      const state = {};
      const selectedEntity = { id: 123 };
      mutations[types.SET_SELECTED_BACKING_ENTITY](state, selectedEntity);
      expect(state.selectedBackingEntity).toEqual(selectedEntity);
    });

    it('SET_ALLOW_BADGER sets community slug error', () => {
      const state = {};
      mutations[types.SET_ALLOW_BADGER](state, false);
      expect(state.allowBadger).toEqual(false);
    });

    it('SET_ORGS sets community slug error', () => {
      const state = {};
      const orgs = [{ id: 123 }, { id: 'abc' }];
      mutations[types.SET_ORGS](state, orgs);
      expect(state.orgs).toEqual(orgs);
    });

    it('SET_REPOS sets community slug error', () => {
      const state = {};
      const repos = [{ id: 123 }, { id: 'abc' }];
      mutations[types.SET_REPOS](state, repos);
      expect(state.repos).toEqual(repos);
    });

    it('SET_ENTITY_TYPE_TAB_STATE sets community slug error', () => {
      const state = {};
      mutations[types.SET_ENTITY_TYPE_TAB_STATE](
        state,
        CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE
      );
      expect(state.entityTypeTabState).toEqual(CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE);
    });
  });

  describe('getters', () => {
    it('gitlabGroups', () => {
      const gitlabGroup1 = createOrgGitlabGroupFixture('gitlab-org/gitter');
      const gitlabGroup2 = createOrgGitlabGroupFixture('gitlab-org');
      const state = {
        orgs: [
          createOrgGithubOrgFixture('gitterhq'),
          gitlabGroup1,
          gitlabGroup2,
          createOrgGithubOrgFixture('troupe')
        ]
      };
      const result = getters.gitlabGroups(state, {});
      expect(result).toEqual([gitlabGroup1, gitlabGroup2]);
    });

    it('gitlabProjects', () => {
      const gitlabProject1 = createRepoGitlabProjectFixture('gitlab-org/gitter/webapp');
      const gitlabProject2 = createRepoGitlabProjectFixture('gitlab-org/gitlab');
      const state = {
        repos: [
          createRepoGithubRepoFixture('gitterhq/gitter'),
          gitlabProject1,
          gitlabProject2,
          createRepoGithubRepoFixture('troupe/gitter-webapp')
        ]
      };
      const result = getters.gitlabProjects(state, {});
      expect(result).toEqual([gitlabProject1, gitlabProject2]);
    });

    it('githubOrgs', () => {
      const githubOrg1 = createOrgGithubOrgFixture('gitterhq');
      const githubOrg2 = createOrgGithubOrgFixture('troupe');
      const state = {
        orgs: [
          githubOrg1,
          createOrgGitlabGroupFixture('gitlab-org/gitter'),
          createOrgGitlabGroupFixture('gitlab-org'),
          githubOrg2
        ]
      };
      const result = getters.githubOrgs(state, {});
      expect(result).toEqual([githubOrg1, githubOrg2]);
    });

    it('githubRepos', () => {
      const githubRepo1 = createRepoGithubRepoFixture('gitterhq/gitter');
      const githubRepo2 = createRepoGithubRepoFixture('troupe/gitter-webapp');
      const state = {
        repos: [githubRepo1, { type: 'UNKNOWN' }, githubRepo2, { type: 'UNKNOWN' }]
      };
      const result = getters.githubRepos(state, {});
      expect(result).toEqual([githubRepo1, githubRepo2]);
    });
  });

  describe('actions', () => {
    it('moveToStep sets the step', async () => {
      await testAction(
        actions.moveToStep,
        CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB,
        {},
        [{ type: types.MOVE_TO_STEP, payload: CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB }],
        []
      );
    });

    describe('setCommunityName', () => {
      it('sets new community name and auto slug', async () => {
        await testAction(
          actions.setCommunityName,
          'foo bar baz',
          { communityName: '', communitySlug: '' },
          [{ type: types.SET_COMMUNITY_NAME, payload: 'foo bar baz' }],
          [{ type: 'updateCommunitySlug', payload: 'foo-bar-baz' }]
        );
      });

      it(`does not overwrite slug when it doesn't match the slugified name (user input a custom slug)`, async () => {
        await testAction(
          actions.setCommunityName,
          'foo bar baz',
          { communityName: '', communitySlug: 'my-custom-slug' },
          [{ type: types.SET_COMMUNITY_NAME, payload: 'foo bar baz' }],
          []
        );
      });
    });

    it('updateCommunitySlug sets the slug', async () => {
      await testAction(
        actions.updateCommunitySlug,
        'foo-bar-baz',
        {},
        [],
        [
          { type: '_setAndValidateCommunitySlug', payload: 'foo-bar-baz' },
          { type: 'autoAssociateMatchingEntity' }
        ]
      );
    });

    it('_setAndValidateCommunitySlug sets the slug', async () => {
      await testAction(
        actions._setAndValidateCommunitySlug,
        'foo-bar-baz',
        {},
        [{ type: types.SET_COMMUNITY_SLUG, payload: 'foo-bar-baz' }],
        [{ type: 'checkSlugAvailability' }]
      );
    });

    describe('autoAssociateMatchingEntity', () => {
      it('when GitHub username matches, associates user to community', async () => {
        await testAction(
          actions.autoAssociateMatchingEntity,
          undefined,
          {
            communitySlug: 'myusername',

            // rootState
            user: {
              username: 'myUsername',
              providers: ['github']
            }
          },
          [],
          [{ type: 'associateUserToCommunity' }]
        );
      });

      it('when GitHub username does not match, does nothing', async () => {
        await testAction(
          actions.autoAssociateMatchingEntity,
          undefined,
          {
            communitySlug: 'someotherusername',

            // rootState
            user: {
              username: 'myUsername',
              providers: ['github']
            }
          },
          [],
          []
        );
      });

      it('when Twitter username matches, tries to associate user (but associateUserToCommunity will do nothing)', async () => {
        await testAction(
          actions.autoAssociateMatchingEntity,
          undefined,
          {
            communitySlug: 'myusername_twitter',

            // rootState
            user: {
              username: 'myUsername_twitter',
              providers: ['twitter']
            }
          },
          [],
          [{ type: 'associateUserToCommunity' }]
        );
      });

      it('when GitHub org matches, associates org to community', async () => {
        const org = {
          uri: 'my-org'
        };
        await testAction(
          actions.autoAssociateMatchingEntity,
          undefined,
          {
            communitySlug: 'my-org',

            // rootState
            orgs: [org]
          },
          [],
          [{ type: 'setSelectedBackingEntity', payload: org }]
        );
      });
    });

    describe('associateUserToCommunity', () => {
      it('associating GitHub user, sets backing entity', async () => {
        await testAction(
          actions.associateUserToCommunity,
          undefined,
          {
            // rootState
            user: {
              username: 'myUsername',
              providers: ['github']
            },

            // rootGetters
            hasProvider: provider => {
              if (provider === 'github') {
                return true;
              }
            }
          },
          [],
          [
            {
              type: 'setSelectedBackingEntity',
              payload: {
                absoluteUri: 'https://github.com/myUsername',
                name: 'myUsername',
                type: 'GH_USER',
                uri: 'myUsername'
              }
            }
          ]
        );
      });

      it('associating GitLab user, sets backing entity', async () => {
        await testAction(
          actions.associateUserToCommunity,
          undefined,
          {
            // rootState
            user: {
              username: 'myUsername_gitlab',
              providers: ['gitlab']
            },

            // rootGetters
            hasProvider: provider => {
              if (provider === 'gitlab') {
                return true;
              }
            }
          },
          [],
          [
            {
              type: 'setSelectedBackingEntity',
              payload: {
                absoluteUri: 'https://gitlab.com/myUsername',
                name: 'myUsername',
                type: 'GL_USER',
                uri: 'myUsername'
              }
            }
          ]
        );
      });
    });

    describe('setSelectedBackingEntity', () => {
      it('sets selected entity group and fills in the community name/slug', async () => {
        const gitlabGroup = createOrgGitlabGroupFixture('gitlab-org');

        await testAction(
          actions.setSelectedBackingEntity,
          gitlabGroup,
          {},
          [
            { type: types.SET_SELECTED_BACKING_ENTITY, payload: gitlabGroup },
            { type: types.SET_COMMUNITY_NAME, payload: 'gitlab-org' }
          ],
          [{ type: '_setAndValidateCommunitySlug', payload: 'gitlab-org' }]
        );
      });

      it('sets selected entity repo and fills in the community name/slug', async () => {
        const githubRepo = createRepoGithubRepoFixture('gitterhq/gitter');

        await testAction(
          actions.setSelectedBackingEntity,
          githubRepo,
          {},
          [
            { type: types.SET_SELECTED_BACKING_ENTITY, payload: githubRepo },
            { type: types.SET_COMMUNITY_NAME, payload: 'gitter' }
          ],
          [{ type: '_setAndValidateCommunitySlug', payload: 'gitter' }]
        );
      });

      it('deselects selected entity', async () => {
        await testAction(
          actions.setSelectedBackingEntity,
          null,
          {},
          [{ type: types.SET_SELECTED_BACKING_ENTITY, payload: null }],
          []
        );
      });
    });

    describe('clearBackingEntity', () => {
      it('clear', async () => {
        await testAction(
          actions.clearBackingEntity,
          undefined,
          {
            selectedBackingEntity: { type: 'GL_GROUP' }
          },
          [
            {
              type: types.SET_SELECTED_BACKING_ENTITY,
              payload: null
            }
          ],
          []
        );
      });
    });

    it('setAllowBadger sets allow badger', async () => {
      await testAction(
        actions.setAllowBadger,
        false,
        {},
        [{ type: types.SET_ALLOW_BADGER, payload: false }],
        []
      );
    });

    it('setEntityTypeTabState sets allow badger', async () => {
      await testAction(
        actions.setEntityTypeTabState,
        CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE,
        {},
        [
          {
            type: types.SET_ENTITY_TYPE_TAB_STATE,
            payload: CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE
          }
        ],
        []
      );
    });

    it('fetchInitial fetches orgs and repos', async () => {
      await testAction(
        actions.fetchInitial,
        CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE,
        {},
        [],
        [{ type: 'fetchOrgs' }, { type: 'fetchRepos' }]
      );
    });

    it('fetchOrgs fetches orgs', async () => {
      apiClient.user.get.mockResolvedValue([]);

      await testAction(
        actions.fetchOrgs,
        [],
        {},
        [
          {
            type: orgsVuexRequest.requestType
          },
          {
            type: orgsVuexRequest.successType
          },
          {
            type: types.SET_ORGS,
            payload: []
          }
        ],
        []
      );

      expect(apiClient.user.get).toHaveBeenCalledWith('/orgs');
    });

    it('fetchRepos fetches repos', async () => {
      apiClient.user.get.mockResolvedValue([]);

      await testAction(
        actions.fetchRepos,
        [],
        {},
        [
          {
            type: reposVuexRequest.requestType
          },
          {
            type: reposVuexRequest.successType
          },
          {
            type: types.SET_REPOS,
            payload: []
          }
        ],
        []
      );

      expect(apiClient.user.get).toHaveBeenCalledWith('/repos', { type: 'admin' });
    });

    it('checkSlugAvailability sets pending and calls the debounced check', async () => {
      await testAction(
        actions.checkSlugAvailability,
        undefined,
        { communitySlug: 'foo-bar-baz' },
        [
          {
            type: types.SET_SLUG_AVAILABILITY_STATUS,
            payload: slugAvailabilityStatusConstants.PENDING
          }
        ],
        [{ type: '_checkSlugAvailabilityDebounced' }]
      );
    });

    describe('_checkSlugAvailabilityDebounced', () => {
      it('sets AVAILABLE when 200 response and type matches', async () => {
        apiClient.priv.get.mockResolvedValue({
          type: null
        });

        await testAction(
          actions._checkSlugAvailabilityDebounced,
          undefined,
          { communitySlug: 'foo-bar-baz', selectedBackingEntity: null },
          [
            {
              type: types.SET_SLUG_AVAILABILITY_STATUS,
              payload: slugAvailabilityStatusConstants.AVAILABLE
            }
          ],
          [{ type: 'validateCommunity' }]
        );

        expect(apiClient.priv.get).toHaveBeenCalledWith(
          '/check-group-uri',
          {
            uri: 'foo-bar-baz'
          },
          {
            global: false
          }
        );
      });

      it('sets GITHUB_CLASH when 403 error response', async () => {
        apiClient.priv.get.mockRejectedValue({
          status: 403
        });

        await testAction(
          actions._checkSlugAvailabilityDebounced,
          undefined,
          { communitySlug: 'foo-bar-baz', selectedBackingEntity: null },
          [
            {
              type: types.SET_SLUG_AVAILABILITY_STATUS,
              payload: slugAvailabilityStatusConstants.GITHUB_CLASH
            }
          ],
          [{ type: 'validateCommunity' }]
        );

        expect(apiClient.priv.get).toHaveBeenCalledWith(
          '/check-group-uri',
          {
            uri: 'foo-bar-baz'
          },
          {
            global: false
          }
        );
      });
    });

    it('validateCommunity sets errors', async () => {
      await testAction(
        actions.validateCommunity,
        undefined,
        { communityName: '', communitySlug: '' },
        [
          {
            type: types.SET_COMMUNITY_NAME_ERROR,
            payload: 'Please fill in the community name'
          },
          {
            type: types.SET_COMMUNITY_SLUG_ERROR,
            payload: 'Please fill in the community slug'
          }
        ],
        []
      );
    });

    describe('submitCommunity', () => {
      beforeEach(() => {
        window.location.assign = jest.fn();
      });

      it('plain old community submit', async () => {
        apiClient.post.mockResolvedValue({
          defaultRoom: {
            name: 'foo-bar-baz/community',
            uri: 'foo-bar-baz/community'
          }
        });

        await testAction(
          actions.submitCommunity,
          undefined,
          {
            communityName: 'foo bar baz',
            communitySlug: 'foo-bar-baz',
            selectedBackingEntity: null
          },
          [
            {
              type: communitySubmitVuexRequest.requestType
            },
            {
              type: communitySubmitVuexRequest.successType
            }
          ],
          [{ type: 'validateCommunity' }]
        );

        expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups`, {
          name: 'foo bar baz',
          uri: 'foo-bar-baz',
          security: undefined,
          addBadge: undefined,
          allowTweeting: true
        });

        expect(window.location.assign).toHaveBeenCalledWith('/foo-bar-baz/community');

        expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-community-view']);
      });

      it('GitLab group based community submit', async () => {
        apiClient.post.mockResolvedValue({
          defaultRoom: {
            name: 'foo-bar-baz/community',
            uri: 'foo-bar-baz/community'
          }
        });

        await testAction(
          actions.submitCommunity,
          undefined,
          {
            communityName: 'foo bar baz',
            communitySlug: 'foo-bar-baz',
            selectedBackingEntity: createOrgGitlabGroupFixture('gitlab-org')
          },
          [
            {
              type: communitySubmitVuexRequest.requestType
            },
            {
              type: communitySubmitVuexRequest.successType
            }
          ],
          [{ type: 'validateCommunity' }]
        );

        expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups`, {
          name: 'foo bar baz',
          uri: 'foo-bar-baz',
          security: {
            type: 'GL_GROUP',
            linkPath: 'gitlab-org'
          },
          addBadge: undefined,
          allowTweeting: true
        });

        expect(window.location.assign).toHaveBeenCalledWith('/foo-bar-baz/community');

        expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-community-view']);
      });

      it('sets error when submit fails', async () => {
        apiClient.post.mockRejectedValue();

        await testAction(
          actions.submitCommunity,
          undefined,
          {
            communityName: 'foo bar baz',
            communitySlug: 'foo-bar-baz',
            selectedBackingEntity: null
          },
          [
            {
              type: communitySubmitVuexRequest.requestType
            },
            {
              type: communitySubmitVuexRequest.errorType
            }
          ],
          [{ type: 'validateCommunity' }]
        );

        expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups`, {
          name: 'foo bar baz',
          uri: 'foo-bar-baz',
          security: undefined,
          addBadge: undefined,
          allowTweeting: true
        });
      });
    });
  });
});
