process.env.TEST_FRIENDLY_DEBOUNCE = '1';

jest.mock('../../../utils/appevents');
jest.mock('../../../components/api-client');

const testAction = require('../../store/__test__/vuex-action-helper');
const appEvents = require('../../../utils/appevents');
const apiClient = require('../../../components/api-client');

const {
  default: { actions, mutations, getters },
  types,
  groupsVuexRequest,
  reposVuexRequest,
  roomSubmitVuexRequest
} = require('.');

import { roomAvailabilityStatusConstants } from '../constants';

const {
  createSerializedUserFixture,
  createSerializedGroupFixture
} = require('../../__test__/fixture-helpers');

describe('create room store', () => {
  beforeEach(() => {
    appEvents.trigger.mockReset();
    apiClient.user.get.mockReset();
    apiClient.priv.get.mockReset();
    apiClient.post.mockReset();
  });

  describe('mutations', () => {
    it('SET_GROUPS sets group map', () => {
      const state = { adminGroupMap: {} };
      const fakeGroup = { id: 1, uri: 'foo/bar' };
      mutations[types.SET_GROUPS](state, [fakeGroup]);
      expect(state.adminGroupMap).toEqual({ 1: fakeGroup });
    });

    it('SET_GROUP_FILTER_TEXT sets group filter text', () => {
      const state = { groupFilterText: '' };
      mutations[types.SET_GROUP_FILTER_TEXT](state, 'test');
      expect(state.groupFilterText).toEqual('test');
    });

    it('SET_SELECTED_GROUP_ID sets selected group id', () => {
      const state = { selectedGroupId: null };
      mutations[types.SET_SELECTED_GROUP_ID](state, 123);
      expect(state.selectedGroupId).toEqual(123);
    });

    it('SET_GROUP_ERROR sets group error', () => {
      const state = { groupError: null };
      mutations[types.SET_GROUP_ERROR](state, 'test-error');
      expect(state.groupError).toEqual('test-error');
    });

    it('SET_ROOM_NAME sets room name', () => {
      const state = { roomName: '' };
      mutations[types.SET_ROOM_NAME](state, 'my-room');
      expect(state.roomName).toEqual('my-room');
    });

    it('SET_ROOM_NAME_AVAILABILITY_STATUS sets room name availability', () => {
      const state = { roomNameAvailabilityStatus: null };
      mutations[types.SET_ROOM_NAME_AVAILABILITY_STATUS](
        state,
        roomAvailabilityStatusConstants.UNAVAILABLE
      );
      expect(state.roomNameAvailabilityStatus).toEqual(roomAvailabilityStatusConstants.UNAVAILABLE);
    });

    it('SET_ROOM_NAME_ERROR sets room name error', () => {
      const state = { roomNameError: '' };
      mutations[types.SET_ROOM_NAME_ERROR](state, 'test-error');
      expect(state.roomNameError).toEqual('test-error');
    });

    it('SET_REPOS sets repo map', () => {
      const state = { adminRepoMap: {} };
      const fakeRepo = { type: 'GL_PROJECT', id: 1, uri: 'foo/bar' };
      mutations[types.SET_REPOS](state, [fakeRepo]);
      expect(state.adminRepoMap).toEqual({ 1: fakeRepo });
    });

    it('SET_REPO_FILTER_TEXT sets repo filter text', () => {
      const state = { repoFilterText: '' };
      mutations[types.SET_REPO_FILTER_TEXT](state, 'test');
      expect(state.repoFilterText).toEqual('test');
    });

    it('SET_SELECTED_REPO_ID sets selected repo id', () => {
      const state = { selectedRepoId: null };
      mutations[types.SET_SELECTED_REPO_ID](state, 123);
      expect(state.selectedRepoId).toEqual(123);
    });

    it('SET_ROOM_SECURITY sets room security', () => {
      const state = { roomSecurity: 'PUBLIC' };
      mutations[types.SET_ROOM_SECURITY](state, 'PRIVATE');
      expect(state.roomSecurity).toEqual('PRIVATE');
    });

    it('SET_ONLY_GITHUB_USERS sets onlyGitHubUsers option', () => {
      const state = { onlyGithubUsers: false };
      mutations[types.SET_ONLY_GITHUB_USERS](state, true);
      expect(state.onlyGithubUsers).toEqual(true);
    });

    it('SET_ALLOW_GROUP_ADMINS sets allowGroupAdmins option', () => {
      const state = { allowGroupAdmins: false };
      mutations[types.SET_ALLOW_GROUP_ADMINS](state, true);
      expect(state.allowGroupAdmins).toEqual(true);
    });

    it('SET_ALLOW_BADGER sets allowBadger option', () => {
      const state = { allowBadger: false };
      mutations[types.SET_ALLOW_BADGER](state, true);
      expect(state.allowBadger).toEqual(true);
    });
  });

  describe('getters', () => {
    describe('hasGithubPrivateRepoScope', () => {
      it('detects user with private_repo access', () => {
        const rootState = {
          user: createSerializedUserFixture({ scopes: { private_repo: true } })
        };
        const state = {};
        const result = getters.hasGithubPrivateRepoScope(state, {}, rootState);
        expect(result).toEqual(true);
      });

      it('No scopes means no private repo scope', () => {
        const rootState = {
          user: createSerializedUserFixture()
        };
        const state = {};
        const result = getters.hasGithubPrivateRepoScope(state, {}, rootState);
        expect(result).toEqual(false);
      });
    });

    // displayedFilteredGroups and displayedFilteredRepos both use the same `filterMapGetter` function for the logic
    describe('displayedFilteredGroups/displayedFilteredRepos', () => {
      it('empty filter text, shows all groups', () => {
        const group1 = createSerializedGroupFixture('gitterhq');
        const group2 = createSerializedGroupFixture('troupe');
        const state = {
          groupFilterText: '',
          adminGroupMap: { [group1.id]: group1, [group2.id]: group2 }
        };
        const result = getters.displayedFilteredGroups(state, {});
        expect(result).toEqual([group1, group2]);
      });

      it('filters groups by name/uri', () => {
        const group1 = createSerializedGroupFixture('gitterhq');
        const group2 = createSerializedGroupFixture('troupe');
        const state = {
          groupFilterText: 'gitter',
          adminGroupMap: { [group1.id]: group1, [group2.id]: group2 }
        };
        const result = getters.displayedFilteredGroups(state, {});
        expect(result).toEqual([group1]);
      });

      it('no groups available shows no results', () => {
        const state = {
          groupFilterText: 'foo',
          adminGroupMap: {}
        };
        const result = getters.displayedFilteredGroups(state, {});
        expect(result).toEqual([]);
      });
    });

    it('selectedGroup grabs correct group from the map', () => {
      const fakeGroup1 = { id: 1, uri: 'foo/bar' };
      const fakeGroup2 = { id: 2, uri: 'qux/zzz' };
      const state = {
        selectedGroupId: 2,
        adminGroupMap: { [fakeGroup1.id]: fakeGroup1, [fakeGroup2.id]: fakeGroup2 }
      };
      const result = getters.selectedGroup(state, {});
      expect(result).toEqual(fakeGroup2);
    });

    it('selectedRepo grabs the correct repo from the map', () => {
      const fakeRepo1 = { type: 'GL_PROJECT', id: 1, uri: 'foo/bar' };
      const fakeRepo2 = { type: 'GL_PROJECT', id: 2, uri: 'qux/zzz' };
      const state = {
        selectedRepoId: 2,
        adminRepoMap: { [fakeRepo1.id]: fakeRepo1, [fakeRepo2.id]: fakeRepo2 }
      };
      const result = getters.selectedRepo(state, {});
      expect(result).toEqual(fakeRepo2);
    });
  });

  describe('actions', () => {
    it('setRoomName sets the room name and checks availability', async () => {
      await testAction(
        actions.setRoomName,
        'new-room-name',
        {},
        [{ type: types.SET_ROOM_NAME, payload: 'new-room-name' }],
        [{ type: 'autoAssociateMatchingRepo' }, { type: 'checkRoomNameAvailability' }]
      );
    });

    it('setSelectedGroupId sets the selected group ID and checks availability', async () => {
      await testAction(
        actions.setSelectedGroupId,
        123,
        {},
        [{ type: types.SET_SELECTED_GROUP_ID, payload: 123 }],
        [{ type: 'autoAssociateMatchingRepo' }, { type: 'checkRoomNameAvailability' }]
      );
    });

    it('setSelectedRepoId sets the selected repo ID and checks availability', async () => {
      await testAction(
        actions.setSelectedRepoId,
        123,
        {},
        [{ type: types.SET_SELECTED_REPO_ID, payload: 123 }],
        [{ type: 'checkRoomNameAvailability' }]
      );
    });

    it('fetchInitial dispatches fetches for all groups and repos', async () => {
      await testAction(
        actions.fetchInitial,
        undefined,
        {},
        [],
        [{ type: 'fetchGroups' }, { type: 'fetchRepos' }]
      );
    });

    describe('fetchGroups', () => {
      it(`fetches repos but current rooms' group is not in admin group list`, async () => {
        const group1 = createSerializedGroupFixture('gitterhq');
        apiClient.user.get.mockResolvedValue([]);

        await testAction(
          actions.fetchGroups,
          [],
          {
            // state
            adminGroupMap: {},

            // rootGetters
            displayedRoom: {
              id: 1,
              groupId: group1.id
            }
          },
          [
            {
              type: groupsVuexRequest.requestType
            },
            {
              type: groupsVuexRequest.successType
            },
            {
              type: types.SET_GROUPS,
              payload: []
            }
          ],
          []
        );

        expect(apiClient.user.get).toHaveBeenCalledWith('/groups', { type: 'admin' });
      });

      it('fetches repos and selects initial group based on current room', async () => {
        const group1 = createSerializedGroupFixture('gitterhq');
        apiClient.user.get.mockResolvedValue([group1]);

        await testAction(
          actions.fetchGroups,
          [],
          {
            // state
            adminGroupMap: {
              [group1.id]: group1
            },

            // rootGetters
            displayedRoom: {
              id: 1,
              groupId: group1.id
            }
          },
          [
            {
              type: groupsVuexRequest.requestType
            },
            {
              type: groupsVuexRequest.successType
            },
            {
              type: types.SET_GROUPS,
              payload: [group1]
            },
            {
              type: types.SET_SELECTED_GROUP_ID,
              payload: group1.id
            }
          ],
          [{ type: 'autoAssociateMatchingRepo' }]
        );

        expect(apiClient.user.get).toHaveBeenCalledWith('/groups', { type: 'admin' });
      });
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
        [{ type: 'autoAssociateMatchingRepo' }]
      );

      expect(apiClient.user.get).toHaveBeenCalledWith('/repos', { type: 'admin' });
    });

    describe('checkRoomNameAvailability', () => {
      it('checkRoomNameAvailability does nothing and resets availability if group is not selected yet', async () => {
        await testAction(
          actions.checkRoomNameAvailability,
          undefined,
          {
            selectedGroupId: null,
            adminGroupMap: {},
            roomNameAvailabilityStatus: roomAvailabilityStatusConstants.UNAVAILABLE
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: null
            }
          ],
          []
        );
      });

      it('checkRoomNameAvailability sets pending and calls the debounced check', async () => {
        const group1 = createSerializedGroupFixture('gitterhq');

        await testAction(
          actions.checkRoomNameAvailability,
          undefined,
          {
            selectedGroupId: group1.id,
            adminGroupMap: { [group1.id]: group1 }
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: roomAvailabilityStatusConstants.PENDING
            }
          ],
          [{ type: '_checkRoomNameAvailabilityDebounced' }]
        );
      });
    });

    describe('_checkRoomNameAvailabilityDebounced', () => {
      it('available when no room or repo conflict', async () => {
        const group1 = createSerializedGroupFixture('gitterhq');

        // Rejecting the checkGithubRepoExistence means the repo does not exist
        apiClient.priv.get.mockRejectedValue({
          status: 404
        });

        await testAction(
          actions._checkRoomNameAvailabilityDebounced,
          undefined,
          {
            // state
            selectedGroupId: group1.id,
            adminGroupMap: { [group1.id]: group1 },
            roomName: 'my-room-name',

            adminRepoMap: {},

            // rootState
            roomMap: {},

            // getters
            selectedGroup: group1,
            targetRoomUri: `${group1.uri}/my-room-name`
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: undefined
            }
          ],
          [{ type: 'validateRoom' }]
        );

        expect(apiClient.priv.get).toHaveBeenCalledWith(
          `/gh/repos/${group1.uri}/my-room-name`,
          {},
          {
            global: false
          }
        );
      });

      it('available when room with GitLab project association and no GitHub repo conflict', async () => {
        const group1 = createSerializedGroupFixture('gitlab');

        // Rejecting the checkGithubRepoExistence means the repo does not exist
        apiClient.priv.get.mockRejectedValue({
          status: 404
        });

        await testAction(
          actions._checkRoomNameAvailabilityDebounced,
          undefined,
          {
            // state
            selectedGroupId: group1.id,
            adminGroupMap: { [group1.id]: group1 },
            roomName: 'foo',

            selectedRepoId: 123,
            adminRepoMap: {
              123: {
                type: 'GL_PROJECT',
                id: 123,
                uri: 'gitlab/some-repo-out-there'
              }
            },

            // rootState
            roomMap: {},

            // getters
            selectedGroup: group1,
            targetRoomUri: `${group1.uri}/foo`
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: undefined
            }
          ],
          [{ type: 'validateRoom' }]
        );

        expect(apiClient.priv.get).toHaveBeenCalledWith(
          `/gh/repos/${group1.uri}/foo`,
          {},
          {
            global: false
          }
        );
      });

      it('available when room with GitHub repo association because matching repo', async () => {
        const group1 = createSerializedGroupFixture('some-repo-exists');
        const repo1 = {
          type: 'GH_REPO',
          id: 123,
          uri: 'some-repo-exists/foo'
        };

        // Resolving to a repo means a GitHub repo exists with this URI
        apiClient.priv.get.mockResolvedValue({
          id: 123,
          uri: 'some-repo-exists/foo'
        });

        await testAction(
          actions._checkRoomNameAvailabilityDebounced,
          undefined,
          {
            // state
            selectedGroupId: group1.id,
            adminGroupMap: { [group1.id]: group1 },
            roomName: 'foo',

            selectedRepoId: [repo1.id],
            adminRepoMap: {
              [repo1.id]: repo1
            },

            // rootState
            roomMap: {},

            // getters
            selectedGroup: group1,
            selectedRepo: repo1,
            targetRoomUri: `${group1.uri}/foo`
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: undefined
            }
          ],
          [{ type: 'validateRoom' }]
        );

        expect(apiClient.priv.get).toHaveBeenCalledWith(
          `/gh/repos/${group1.uri}/foo`,
          {},
          {
            global: false
          }
        );
      });

      it('not available when room with GitLab project association because conflict with GitHub repo', async () => {
        const group1 = createSerializedGroupFixture('some-repo-exists');
        const repo1 = {
          type: 'GL_PROJECT',
          id: 999,
          uri: 'some-repo-exists/foo'
        };

        // Resolving to a repo means a GitHub repo exists with this URI
        apiClient.priv.get.mockResolvedValue({
          id: 123,
          uri: 'some-repo-exists/foo'
        });

        await testAction(
          actions._checkRoomNameAvailabilityDebounced,
          undefined,
          {
            // state
            selectedGroupId: group1.id,
            adminGroupMap: { [group1.id]: group1 },
            roomName: 'foo',

            selectedRepoId: repo1.id,
            adminRepoMap: {
              [repo1.id]: repo1
            },

            // rootState
            roomMap: {},

            // getters
            selectedGroup: group1,
            selectedRepo: repo1,
            targetRoomUri: `${group1.uri}/foo`
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: roomAvailabilityStatusConstants.REPO_CONFLICT
            }
          ],
          [{ type: 'validateRoom' }]
        );

        expect(apiClient.priv.get).toHaveBeenCalledWith(
          `/gh/repos/${group1.uri}/foo`,
          {},
          {
            global: false
          }
        );
      });

      it('not available when local room conflict', async () => {
        const group1 = createSerializedGroupFixture('gitterhq');

        await testAction(
          actions._checkRoomNameAvailabilityDebounced,
          undefined,
          {
            // state
            selectedGroupId: group1.id,
            adminGroupMap: { [group1.id]: group1 },
            roomName: 'my-room-name',

            adminRepoMap: {},

            // rootState
            roomMap: {
              1: {
                // There already is a room in your local room list so you
                // obviously can't create another room with the same name
                lcUri: `${group1.uri}/my-room-name`
              }
            },

            // getters
            selectedGroup: group1,
            targetRoomUri: `${group1.uri}/my-room-name`
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: roomAvailabilityStatusConstants.UNAVAILABLE
            }
          ],
          [{ type: 'validateRoom' }]
        );
      });

      it('not available when GitHub repo conflict', async () => {
        const group1 = createSerializedGroupFixture('gitterhq');

        // Resolving to a repo means a GitHub repo exists with this URI (conflict)
        apiClient.priv.get.mockResolvedValue({
          id: 123,
          uri: 'some-repo-exists/foo'
        });

        await testAction(
          actions._checkRoomNameAvailabilityDebounced,
          undefined,
          {
            // state
            selectedGroupId: group1.id,
            adminGroupMap: { [group1.id]: group1 },
            roomName: 'my-room-name',

            adminRepoMap: {},

            // rootState
            roomMap: {},

            // getters
            selectedGroup: group1,
            targetRoomUri: `${group1.uri}/my-room-name`
          },
          [
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: roomAvailabilityStatusConstants.REPO_CONFLICT
            }
          ],
          [{ type: 'validateRoom' }]
        );

        expect(apiClient.priv.get).toHaveBeenCalledWith(
          `/gh/repos/${group1.uri}/my-room-name`,
          {},
          {
            global: false
          }
        );
      });
    });

    describe('validateRoom', () => {
      it('no selected group gives group error', async () => {
        await testAction(
          actions.validateRoom,
          undefined,
          {
            // state
            roomName: 'foo',
            roomNameAvailabilityStatus: null,

            // getters
            selectedGroup: null
          },
          [
            { type: types.SET_GROUP_ERROR, payload: 'Please select a group.' },
            { type: types.SET_ROOM_NAME_ERROR }
          ],
          []
        );
      });

      it('empty room name gives room name error', async () => {
        await testAction(
          actions.validateRoom,
          undefined,
          {
            // state
            roomName: '',
            roomNameAvailabilityStatus: null,

            // getters
            selectedGroup: { id: 123 }
          },
          [
            { type: types.SET_GROUP_ERROR },
            { type: types.SET_ROOM_NAME_ERROR, payload: 'Please fill in the room name.' }
          ],
          []
        );
      });

      it('problem with room name availability status gives room name error', async () => {
        await testAction(
          actions.validateRoom,
          undefined,
          {
            // state
            roomName: 'foo',
            roomNameAvailabilityStatus: roomAvailabilityStatusConstants.UNAVAILABLE,

            // getters
            selectedGroup: { id: 123 }
          },
          [
            { type: types.SET_GROUP_ERROR },
            { type: types.SET_ROOM_NAME_ERROR, payload: 'There is already a room with that name.' }
          ],
          []
        );
      });
    });

    describe('submitRoom', () => {
      beforeEach(() => {
        window.location.assign = jest.fn();
      });

      it('trying to submit wihtout a group selected does nothing', async () => {
        await testAction(
          actions.submitRoom,
          undefined,
          {
            // getters
            selectedGroup: null
          },
          [],
          [{ type: 'validateRoom' }]
        );
      });

      describe('security', () => {
        it('submit room with repo association matches type/linkPath', async () => {
          const group1 = createSerializedGroupFixture('gitlab-org');

          apiClient.post.mockResolvedValue({
            uri: 'the-room-redirect-after-creation'
          });

          await testAction(
            actions.submitRoom,
            undefined,
            {
              // state
              roomName: 'gitlab',
              roomNameError: null,

              // getters
              selectedGroup: { id: group1.id },
              selectedRepo: { type: 'GL_PROJECT', id: 999, uri: 'gitlab-org/gitlab' }
            },
            [
              {
                type: roomSubmitVuexRequest.requestType
              },
              {
                type: roomSubmitVuexRequest.successType
              }
            ],
            [{ type: 'validateRoom' }]
          );

          expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups/${group1.id}/rooms`, {
            name: 'gitlab',
            security: {
              type: 'GL_PROJECT',
              linkPath: 'gitlab-org/gitlab',
              security: undefined
            },
            addBadge: undefined
          });

          expect(window.location.assign).toHaveBeenCalledWith('/the-room-redirect-after-creation');

          expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
        });

        it('submit private room', async () => {
          const group1 = createSerializedGroupFixture('gitlab-org');

          apiClient.post.mockResolvedValue({
            uri: 'the-room-redirect-after-creation'
          });

          await testAction(
            actions.submitRoom,
            undefined,
            {
              // state
              roomName: 'gitlab',
              roomNameError: null,
              roomSecurity: 'PRIVATE',

              // getters
              selectedGroup: { id: group1.id },
              selectedRepo: null
            },
            [
              {
                type: roomSubmitVuexRequest.requestType
              },
              {
                type: roomSubmitVuexRequest.successType
              }
            ],
            [{ type: 'validateRoom' }]
          );

          expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups/${group1.id}/rooms`, {
            name: 'gitlab',
            security: {
              type: null,
              linkPath: null,
              security: 'PRIVATE'
            },
            addBadge: undefined
          });

          expect(window.location.assign).toHaveBeenCalledWith('/the-room-redirect-after-creation');

          expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
        });

        it('submit private room with allowGroupAdmins option', async () => {
          const group1 = createSerializedGroupFixture('gitlab-org');

          apiClient.post.mockResolvedValue({
            uri: 'the-room-redirect-after-creation'
          });

          await testAction(
            actions.submitRoom,
            undefined,
            {
              // state
              roomName: 'gitlab',
              roomNameError: null,
              roomSecurity: 'PRIVATE',
              allowGroupAdmins: true,

              // getters
              selectedGroup: { id: group1.id },
              selectedRepo: null
            },
            [
              {
                type: roomSubmitVuexRequest.requestType
              },
              {
                type: roomSubmitVuexRequest.successType
              }
            ],
            [{ type: 'validateRoom' }]
          );

          expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups/${group1.id}/rooms`, {
            name: 'gitlab',
            security: {
              type: 'GROUP',
              linkPath: null,
              security: 'INHERITED'
            },
            addBadge: undefined
          });

          expect(window.location.assign).toHaveBeenCalledWith('/the-room-redirect-after-creation');

          expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
        });

        it('submit public room', async () => {
          const group1 = createSerializedGroupFixture('gitlab-org');

          apiClient.post.mockResolvedValue({
            uri: 'the-room-redirect-after-creation'
          });

          await testAction(
            actions.submitRoom,
            undefined,
            {
              // state
              roomName: 'gitlab',
              roomNameError: null,
              roomSecurity: 'PUBLIC',

              // getters
              selectedGroup: { id: group1.id },
              selectedRepo: null
            },
            [
              {
                type: roomSubmitVuexRequest.requestType
              },
              {
                type: roomSubmitVuexRequest.successType
              }
            ],
            [{ type: 'validateRoom' }]
          );

          expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups/${group1.id}/rooms`, {
            name: 'gitlab',
            security: {
              type: 'GROUP',
              linkPath: null,
              security: 'PUBLIC'
            },
            addBadge: undefined
          });

          expect(window.location.assign).toHaveBeenCalledWith('/the-room-redirect-after-creation');

          expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
        });
      });

      describe('allowBadger option', () => {
        it('allowBadger=true will add addBadge=true on the request', async () => {
          const group1 = createSerializedGroupFixture('gitlab-org');

          apiClient.post.mockResolvedValue({
            uri: 'the-room-redirect-after-creation'
          });

          await testAction(
            actions.submitRoom,
            undefined,
            {
              // state
              roomName: 'gitlab',
              roomNameError: null,
              roomSecurity: 'PUBLIC',
              allowBadger: true,

              // getters
              selectedGroup: { id: group1.id },
              selectedRepo: null
            },
            [
              {
                type: roomSubmitVuexRequest.requestType
              },
              {
                type: roomSubmitVuexRequest.successType
              }
            ],
            [{ type: 'validateRoom' }]
          );

          expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups/${group1.id}/rooms`, {
            name: 'gitlab',
            security: {
              type: 'GROUP',
              linkPath: null,
              security: 'PUBLIC'
            },
            addBadge: true
          });

          expect(window.location.assign).toHaveBeenCalledWith('/the-room-redirect-after-creation');

          expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
        });
      });

      describe('onlyGithubUsers option', () => {
        it('onlyGithubUsers=true will add providers on the request', async () => {
          const group1 = createSerializedGroupFixture('gitlab-org');

          apiClient.post.mockResolvedValue({
            uri: 'the-room-redirect-after-creation'
          });

          await testAction(
            actions.submitRoom,
            undefined,
            {
              // state
              roomName: 'gitlab',
              roomNameError: null,
              roomSecurity: 'PUBLIC',
              onlyGithubUsers: true,

              // getters
              selectedGroup: { id: group1.id },
              selectedRepo: null
            },
            [
              {
                type: roomSubmitVuexRequest.requestType
              },
              {
                type: roomSubmitVuexRequest.successType
              }
            ],
            [{ type: 'validateRoom' }]
          );

          expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups/${group1.id}/rooms`, {
            name: 'gitlab',
            security: {
              type: 'GROUP',
              linkPath: null,
              security: 'PUBLIC'
            },
            addBadge: undefined,
            providers: ['github']
          });

          expect(window.location.assign).toHaveBeenCalledWith('/the-room-redirect-after-creation');

          expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
        });
      });

      it('illegal name fails and sets error', async () => {
        const group1 = createSerializedGroupFixture('gitlab-org');

        // Problem submitting the new room
        apiClient.post.mockRejectedValue({
          status: 400,
          response: { error: 'Bad Request' }
        });

        await testAction(
          actions.submitRoom,
          undefined,
          {
            // state
            // Illegal room name
            roomName: '$ 4432 ##$#%@#^%@^',
            roomNameError: null,
            roomSecurity: 'PUBLIC',

            // getters
            selectedGroup: { id: group1.id },
            selectedRepo: null
          },
          [
            {
              type: roomSubmitVuexRequest.requestType
            },
            {
              type: roomSubmitVuexRequest.errorType,
              payload: {
                status: 400,
                response: { error: 'Bad Request' }
              }
            },
            {
              type: types.SET_ROOM_NAME_AVAILABILITY_STATUS,
              payload: roomAvailabilityStatusConstants.VALIDATION_FAILED
            }
          ],
          [{ type: 'validateRoom' }, { type: 'validateRoom' }]
        );

        expect(apiClient.post).toHaveBeenCalledWith(`/v1/groups/${group1.id}/rooms`, {
          name: '$ 4432 ##$#%@#^%@^',
          security: {
            type: 'GROUP',
            linkPath: null,
            security: 'PUBLIC'
          },
          addBadge: undefined
        });
      });
    });
  });
});
