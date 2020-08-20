import _ from 'lodash';
import debugProxy from 'debug-proxy';
import createTextFilter from 'text-filter';
import Vue from 'vue';
import VuexApiRequest from '../../store/vuex-api-request';
import apiClient from '../../../components/api-client';
import log from '../../../utils/log';
import appEvents from '../../../utils/appevents';
import validateRoomName from '../lib/validate-room-name';
import { roomAvailabilityStatusConstants } from '../constants';
import prepareSecurityForNewRoom from '../lib/prepare-security-for-new-room';

const debug = debugProxy('app:create-community:store');

// When testing, disable the debounce so we can test without any weird flakiness
function conditionalDebounce(cb, ...args) {
  if (typeof process !== 'undefined' && process.env.TEST_FRIENDLY_DEBOUNCE) {
    return cb;
  }

  return _.debounce(cb, ...args);
}

async function checkGithubRepoExistence(uri) {
  let doesExist = false;
  try {
    // #github-uri-split
    await apiClient.priv.get(
      `/gh/repos/${uri}`,
      {},
      {
        global: false
      }
    );

    doesExist = true;
  } catch (err) {
    doesExist = false;
  }

  return doesExist;
}

function filterMapGetter(map, filterText) {
  const items = Object.values(map);

  if (filterText && items) {
    return items.filter(createTextFilter({ query: filterText, fields: ['uri', 'name'] }));
  } else if (filterText && !items) {
    return [];
  }

  return items;
}

// Exported for testing
export const groupsVuexRequest = new VuexApiRequest('GROUPS', 'groupsRequest');
export const reposVuexRequest = new VuexApiRequest('REPOS', 'reposRequest');
export const roomSubmitVuexRequest = new VuexApiRequest('ROOM_SUBMIT', 'roomSubmitRequest');

// Exported for testing
export const types = {
  SET_GROUPS: 'SET_GROUPS',
  SET_GROUP_FILTER_TEXT: 'SET_GROUP_FILTER_TEXT',
  SET_SELECTED_GROUP_ID: 'SET_SELECTED_GROUP_ID',
  SET_GROUP_ERROR: 'SET_GROUP_ERROR',

  SET_ROOM_NAME: 'SET_ROOM_NAME',
  SET_ROOM_NAME_AVAILABILITY_STATUS: 'SET_ROOM_NAME_AVAILABILITY_STATUS',
  SET_ROOM_NAME_ERROR: 'SET_ROOM_NAME_ERROR',

  SET_REPOS: 'SET_REPOS',
  SET_REPO_FILTER_TEXT: 'SET_REPO_FILTER_TEXT',
  SET_SELECTED_REPO_ID: 'SET_SELECTED_REPO_ID',

  SET_ROOM_SECURITY: 'SET_ROOM_SECURITY',

  SET_ONLY_GITHUB_USERS: 'SET_ONLY_GITHUB_USERS',
  SET_ALLOW_GROUP_ADMINS: 'SET_ALLOW_GROUP_ADMINS',
  SET_ALLOW_BADGER: 'SET_ALLOW_BADGER',

  ...groupsVuexRequest.types,
  ...reposVuexRequest.types,
  ...roomSubmitVuexRequest.types
};

export default {
  namespaced: true,
  state: () => ({
    adminGroupMap: {},
    groupFilterText: '',
    selectedGroupId: null,
    groupError: null,

    roomName: '',
    roomNameError: null,
    roomNameAvailabilityStatus: null,

    adminRepoMap: {},
    repoFilterText: '',
    selectedRepoId: null,

    roomSecurity: 'PUBLIC',

    onlyGithubUsers: false,
    allowGroupAdmins: false,
    allowBadger: true,
    repos: [],
    ...groupsVuexRequest.initialState,
    ...reposVuexRequest.initialState,
    ...roomSubmitVuexRequest.initialState
  }),
  mutations: {
    [types.SET_GROUPS](state, groups) {
      groups.forEach(group => {
        Vue.set(state.adminGroupMap, group.id, group);
      });
    },
    [types.SET_GROUP_FILTER_TEXT](state, groupFilterText) {
      state.groupFilterText = groupFilterText;
    },
    [types.SET_SELECTED_GROUP_ID](state, newSelectedGroupId) {
      state.selectedGroupId = newSelectedGroupId;
    },
    [types.SET_GROUP_ERROR](state, newError) {
      state.groupError = newError;
    },

    [types.SET_ROOM_NAME](state, roomName) {
      state.roomName = roomName;
    },
    [types.SET_ROOM_NAME_AVAILABILITY_STATUS](state, newRoomNameAvailabilityStatus) {
      state.roomNameAvailabilityStatus = newRoomNameAvailabilityStatus;
    },
    [types.SET_ROOM_NAME_ERROR](state, newError) {
      state.roomNameError = newError;
    },

    [types.SET_REPOS](state, repos) {
      repos.forEach(repo => {
        Vue.set(state.adminRepoMap, repo.id, repo);
      });
    },
    [types.SET_REPO_FILTER_TEXT](state, repoFilterText) {
      state.repoFilterText = repoFilterText;
    },
    [types.SET_SELECTED_REPO_ID](state, newSelectedRepoId) {
      state.selectedRepoId = newSelectedRepoId;
    },

    [types.SET_ROOM_SECURITY](state, newRoomSecurity) {
      state.roomSecurity = newRoomSecurity;
    },

    [types.SET_ONLY_GITHUB_USERS](state, newValue) {
      state.onlyGithubUsers = newValue;
    },
    [types.SET_ALLOW_GROUP_ADMINS](state, newValue) {
      state.allowGroupAdmins = newValue;
    },
    [types.SET_ALLOW_BADGER](state, allowBadger) {
      state.allowBadger = allowBadger;
    },

    ...groupsVuexRequest.mutations,
    ...reposVuexRequest.mutations,
    ...roomSubmitVuexRequest.mutations
  },
  getters: {
    hasGithubPrivateRepoScope(state, getters, rootState) {
      const user = rootState.user;
      return !!(user && user.scopes && user.scopes.private_repo);
    },
    displayedFilteredGroups(state) {
      return filterMapGetter(state.adminGroupMap, state.groupFilterText);
    },
    displayedFilteredRepos(state) {
      return filterMapGetter(state.adminRepoMap, state.repoFilterText);
    },
    selectedGroup(state) {
      return state.adminGroupMap[state.selectedGroupId];
    },
    selectedRepo(state) {
      return state.adminRepoMap[state.selectedRepoId];
    },
    targetRoomUri(state, getters) {
      const selectedGroup = getters.selectedGroup;
      if (selectedGroup) {
        return selectedGroup.uri + '/' + state.roomName;
      }

      return '';
    }
  },
  actions: {
    setRoomName: ({ commit, dispatch }, newRoomName) => {
      commit(types.SET_ROOM_NAME, newRoomName);
      dispatch('autoAssociateMatchingRepo');
      dispatch('checkRoomNameAvailability');
    },

    setSelectedGroupId: ({ commit, dispatch }, groupId) => {
      commit(types.SET_SELECTED_GROUP_ID, groupId);
      dispatch('autoAssociateMatchingRepo');
      dispatch('checkRoomNameAvailability');
    },

    setSelectedRepoId: ({ commit, dispatch }, repoID) => {
      commit(types.SET_SELECTED_REPO_ID, repoID);

      dispatch('checkRoomNameAvailability');
    },

    autoAssociateMatchingRepo: ({ state, getters, dispatch }) => {
      const selectedRepo = getters.selectedRepo;
      const selectedGroup = getters.selectedGroup;
      // Only auto-associate if they haven't already selected a repo
      if (!selectedRepo && selectedGroup) {
        const targetRoomUri = getters.targetRoomUri.toLowerCase();

        const matchingRepo = Object.values(state.adminRepoMap).find(repo => {
          return repo.uri.toLowerCase() === targetRoomUri;
        });

        if (matchingRepo) {
          dispatch('setSelectedRepoId', matchingRepo.id);
        }
      }
    },

    fetchInitial: ({ dispatch }) => {
      dispatch('fetchGroups');
      dispatch('fetchRepos');
    },
    fetchGroups: ({ commit, state, rootGetters, dispatch }) => {
      commit(groupsVuexRequest.requestType);
      return apiClient.user
        .get(`/groups`, {
          type: 'admin'
        })
        .then(groups => {
          commit(groupsVuexRequest.successType);
          commit(types.SET_GROUPS, groups);

          // Initialize the selected group to match the current room if they can admin it
          const currentRoom = rootGetters.displayedRoom;
          if (currentRoom && currentRoom.groupId && state.adminGroupMap[currentRoom.groupId]) {
            commit(types.SET_SELECTED_GROUP_ID, currentRoom.groupId);
            dispatch('autoAssociateMatchingRepo');
          }
        })
        .catch(err => {
          log.error(err);
          commit(groupsVuexRequest.errorType, err);
        });
    },
    fetchRepos: ({ commit, dispatch }) => {
      commit(reposVuexRequest.requestType);
      return apiClient.user
        .get(`/repos`, {
          type: 'admin'
        })
        .then(repos => {
          commit(reposVuexRequest.successType);
          commit(types.SET_REPOS, repos);
          dispatch('autoAssociateMatchingRepo');
        })
        .catch(err => {
          log.error(err);
          commit(reposVuexRequest.errorType, err);
        });
    },
    checkRoomNameAvailability: ({ commit, state, dispatch }) => {
      const selectedGroup = state.adminGroupMap[state.selectedGroupId];
      if (selectedGroup) {
        // Set pending immediately
        commit(types.SET_ROOM_NAME_AVAILABILITY_STATUS, roomAvailabilityStatusConstants.PENDING);

        // Then go off and actually check
        dispatch('_checkRoomNameAvailabilityDebounced');
      } else {
        // Reset the status if no group is selected
        // We can't determine availability without the group selected
        commit(types.SET_ROOM_NAME_AVAILABILITY_STATUS, null);
      }
    },
    _checkRoomNameAvailabilityDebounced: conditionalDebounce(
      async ({ commit, rootState, getters, dispatch }) => {
        let roomNameAvailabilityStatus;

        const selectedGroup = getters.selectedGroup;
        const lowerCaseTargetRoomUri = getters.targetRoomUri.toLowerCase();

        const roomAlreadyExistsLocally =
          selectedGroup &&
          Object.values(rootState.roomMap).some(room => {
            return room.lcUri === lowerCaseTargetRoomUri;
          });

        // If we found the room locally, no reason to look it up, we already know it's unavailable and already exists
        if (roomAlreadyExistsLocally) {
          roomNameAvailabilityStatus = roomAvailabilityStatusConstants.UNAVAILABLE;
        }
        // Otherwise let's go check the API if there is problem
        else {
          const doesGithubRepoExist = await checkGithubRepoExistence(lowerCaseTargetRoomUri);
          const selectedRepo = getters.selectedRepo;

          // You can still create a room with the same name as the repo if you associate it with repo
          let doesTargetRoomUriMatchSelectedRepoUri = false;
          if (selectedRepo && selectedRepo.type === 'GH_REPO') {
            doesTargetRoomUriMatchSelectedRepoUri =
              lowerCaseTargetRoomUri === (selectedRepo.uri || '').toLowerCase();
          }

          if (doesGithubRepoExist && !doesTargetRoomUriMatchSelectedRepoUri) {
            roomNameAvailabilityStatus = roomAvailabilityStatusConstants.REPO_CONFLICT;
          }
        }

        commit(types.SET_ROOM_NAME_AVAILABILITY_STATUS, roomNameAvailabilityStatus);

        // Update the error message
        dispatch('validateRoom');
      },
      300
    ),
    validateRoom: ({ commit, state, getters }) => {
      if (getters.selectedGroup) {
        commit(types.SET_GROUP_ERROR, undefined);
      } else {
        commit(types.SET_GROUP_ERROR, 'Please select a group.');
      }

      const roomNameError = validateRoomName(state.roomName, state.roomNameAvailabilityStatus);
      if (roomNameError) {
        commit(types.SET_ROOM_NAME_ERROR, roomNameError);
      } else {
        commit(types.SET_ROOM_NAME_ERROR, undefined);
      }
    },

    submitRoom: async ({ commit, state, getters, dispatch }) => {
      await dispatch('validateRoom');

      const selectedGroup = getters.selectedGroup;
      const selectedRepo = getters.selectedRepo;

      // We have no API endpoint to submit to without a group selected
      if (!selectedGroup) {
        return;
      }

      const { type, linkPath, security } = prepareSecurityForNewRoom(
        selectedRepo,
        state.allowGroupAdmins,
        state.roomSecurity
      );

      const payload = {
        name: state.roomName,
        security: {
          type: type,
          linkPath: linkPath,
          security: security
        },
        addBadge: state.allowBadger
      };
      if (state.onlyGithubUsers) {
        payload.providers = ['github'];
      }

      commit(roomSubmitVuexRequest.requestType);
      return apiClient
        .post(`/v1/groups/${selectedGroup.id}/rooms`, payload)
        .then(res => {
          commit(roomSubmitVuexRequest.successType);

          const room = res;

          // Move to the default room
          debug(`Moving to room ${room}(${room.uri})`);
          window.location.assign(`/${room.uri}`);

          // Then destroy the community create view
          appEvents.trigger('destroy-create-room-view');
        })
        .catch(err => {
          log.error(err);
          commit(roomSubmitVuexRequest.errorType, err);

          const status = err.status;
          let roomNameAvailabilityStatus;
          switch (status) {
            case 400:
              // TODO: send this from the server
              if (err.response && err.response.illegalName) {
                roomNameAvailabilityStatus = roomAvailabilityStatusConstants.ILLEGAL_NAME;
              } else {
                roomNameAvailabilityStatus = roomAvailabilityStatusConstants.VALIDATION_FAILED;
              }
              break;

            case 403:
              roomNameAvailabilityStatus = roomAvailabilityStatusConstants.INSUFFICIENT_PERMISSIONS;
              break;

            case 409:
              roomNameAvailabilityStatus = roomAvailabilityStatusConstants.UNAVAILABLE;
              break;
          }

          commit(types.SET_ROOM_NAME_AVAILABILITY_STATUS, roomNameAvailabilityStatus);
          // Update the error message
          dispatch('validateRoom');
        });
    }
  }
};
