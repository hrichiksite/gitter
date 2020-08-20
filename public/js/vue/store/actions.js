import * as types from './mutation-types';
import {
  roomSearchRepoRequest,
  roomSearchRoomRequest,
  roomSearchPeopleRequest,
  messageSearchRequest,
  joinRoomRequest
} from './requests';
import context from 'gitter-web-client-context';
import apiClient from '../../components/api-client';
import appEvents from '../../utils/appevents';
import log from '../../utils/log';
import * as leftMenuConstants from '../left-menu/constants';
import calculateFavouriteUpdates from 'gitter-web-rooms/lib/calculate-favourite-updates';

export const setInitialData = ({ commit }, data) => commit(types.SET_INITIAL_DATA, data);

export const trackStat = (actionMeta, statName) => {
  appEvents.trigger('stats.event', statName);
  appEvents.trigger('track-event', statName);
};

export const toggleDarkTheme = ({ commit }, toggleState) =>
  commit(types.TOGGLE_DARK_THEME, toggleState);

export const setLeftMenuState = ({ commit, dispatch }, newLeftMenuState) => {
  commit(types.SWITCH_LEFT_MENU_STATE, newLeftMenuState);

  dispatch('trackStat', `left-menu.minibar.activated.${newLeftMenuState}`);

  // When we switch to the search panel, re-search for messages in that room
  if (newLeftMenuState === leftMenuConstants.LEFT_MENU_SEARCH_STATE) {
    dispatch('fetchMessageSearchResults');
  }
};

export const toggleLeftMenuPinnedState = ({ commit, dispatch }, toggleState) => {
  commit(types.TOGGLE_LEFT_MENU_PINNED_STATE, toggleState);
  dispatch('trackStat', `left-menu.pinned.${toggleState}`);
};

export const toggleLeftMenu = ({ commit, dispatch }, toggleState) => {
  commit(types.TOGGLE_LEFT_MENU, toggleState);
  dispatch('trackStat', `left-menu.toggle.${toggleState}`);
};

export const updatefavouriteDraggingInProgress = ({ commit }, toggleState) =>
  commit(types.UPDATE_FAVOURITE_DRAGGING_STATE, toggleState);

// Only meant to be used internally by other actions
// This does all the favouriting but doesn't persist anything
export const _localUpdateRoomFavourite = ({ state, dispatch }, { id, favourite }) => {
  dispatch('upsertRoom', {
    id,
    favourite
  });

  const roomIdFavouritePositionPairs = Object.values(state.roomMap).map(room => {
    return [room.id, room.favourite];
  });

  // After we update the item in question, we probably need to increment
  // subsequent items in the list so everything stays in order
  //
  // This shares the same logic on the backend for calculating the new favourite indexes
  const updates = calculateFavouriteUpdates(id, favourite, roomIdFavouritePositionPairs);
  updates.forEach(([id, favourite]) => {
    dispatch('upsertRoom', {
      id,
      favourite
    });
  });
};

export const updateRoomFavourite = ({ state, commit, dispatch }, { id, favourite }) => {
  const room = state.roomMap[id];
  const oldFavourite = room && room.favourite;

  dispatch('_localUpdateRoomFavourite', {
    id,
    favourite
  });

  commit(types.REQUEST_ROOM_FAVOURITE, id);
  apiClient.user
    .patch(`/rooms/${id}`, {
      favourite
    })
    .then(result => {
      commit(types.RECEIVE_ROOM_FAVOURITE_SUCCESS, result.id);
      dispatch('upsertRoom', result);
    })
    .catch(err => {
      commit(types.RECEIVE_ROOM_FAVOURITE_ERROR, { id, error: err });

      // Rollback to the previous state
      //
      // Note: This is flawed in the fact that if multiple rooms are favourited before
      // the request finishes, the rollback position may not be correct
      let rollbackFavourite;
      // Moving item up in the list
      if (oldFavourite > favourite) {
        // We need to increment by 1 because the itemBeingMoved already moved and is taking up space
        // so we want to get the new index that represents where the itemBeingMoved was before
        rollbackFavourite = oldFavourite + 1;
      }
      // Otherwise item moving down in the list
      else {
        rollbackFavourite = oldFavourite;
      }
      dispatch('_localUpdateRoomFavourite', {
        id,
        favourite: rollbackFavourite
      });

      appEvents.triggerParent('user_notification', {
        title: 'Error favouriting room',
        text: err.message
      });
    });
};

export const updateSearchInputValue = ({ commit }, newSearchInputValue) => {
  commit(types.UPDATE_SEARCH_INPUT_VALUE, newSearchInputValue);
};

export const fetchRoomSearchResults = ({ state, commit, dispatch }) => {
  const searchInputValue = state.search.searchInputValue;

  if (searchInputValue && searchInputValue.length > 0) {
    commit(types.UPDATE_ROOM_SEARCH_CURRENT);

    dispatch('trackStat', 'left-menu.search.input');

    commit(roomSearchRepoRequest.requestType);
    apiClient.user
      .get('/repos', {
        q: searchInputValue,
        type: 'gitter',
        limit: 3
      })
      .then(result => {
        const repos = (result && result.results) || [];
        const roomsFromRepos = repos.map(repo => repo.room).filter(Boolean);

        roomsFromRepos.forEach(room => {
          dispatch('upsertRoom', room);
        });
        commit(roomSearchRepoRequest.successType, roomsFromRepos.map(room => room.id));
      })
      .catch(err => {
        commit(roomSearchRepoRequest.errorType, err);
      });

    commit(roomSearchRoomRequest.requestType);
    apiClient
      .get('/v1/rooms', {
        q: searchInputValue,
        type: 'gitter',
        limit: 3
      })
      .then(result => {
        const rooms = (result && result.results) || [];
        rooms.forEach(room => {
          dispatch('upsertRoom', room);
        });
        commit(roomSearchRoomRequest.successType, rooms.map(room => room.id));
      })
      .catch(err => {
        commit(roomSearchRoomRequest.errorType, err);
      });

    commit(roomSearchPeopleRequest.requestType);
    apiClient
      .get('/v1/user', {
        q: searchInputValue,
        type: 'gitter',
        limit: 3
      })
      .then(result => {
        const rooms = (result && result.results) || [];
        rooms.forEach(room => {
          dispatch('upsertRoom', room);
        });
        commit(roomSearchPeopleRequest.successType, rooms.map(room => room.id));
      })
      .catch(err => {
        commit(roomSearchPeopleRequest.errorType, err);
      });
  } else {
    commit(types.SEARCH_CLEARED);
  }
};

export const fetchMessageSearchResults = ({ state, commit }) => {
  const searchInputValue = state.search.searchInputValue;

  if (searchInputValue && searchInputValue.length > 0) {
    commit(messageSearchRequest.requestType);
    apiClient.room
      .get('/chatMessages', {
        q: searchInputValue,
        lang: context.lang(),
        limit: 30
      })
      .then(result => {
        commit(messageSearchRequest.successType, result);
      })
      .catch(err => {
        commit(messageSearchRequest.errorType, err);
      });
  }
};

export const changeDisplayedRoomById = ({ state, commit, dispatch }, newRoomId) => {
  dispatch('threadMessageFeed/close');
  commit(types.CHANGE_DISPLAYED_ROOM, newRoomId);

  const newRoom = state.roomMap[newRoomId];

  if (newRoom) {
    dispatch('trackStat', 'left-menu.changeRoom');

    // If there is a current room, it means that the router-chat routing is in place to switch to other rooms
    const currentRoom = context.troupe();
    if (currentRoom && currentRoom.id) {
      appEvents.trigger('navigation', newRoom.url, 'chat', newRoom.name);
      appEvents.trigger('vue:change:room', newRoom);
    } else {
      // Otherwise, we need to redirect
      // We are using `window.location.assign` so we can easily mock/spy in the tests
      window.location.assign(newRoom.url);
    }
  } else {
    log.error(`Unable to change to room that is not in our roomMap: ${newRoomId}`);
  }
};

/**
 * Changes the displayed room without reloading the page if the URL belongs to any
 * room stored in messageMap. Otherwise it just changes window location to the URL.
 *
 * TODO: this has been implemented for supporting one-to-one room switching from the legacy code
 *       it can be removed once we move the `userPopoverView.js` to Vue
 */
export const changeDisplayedRoomByUrl = ({ state, dispatch }, roomUrl) => {
  const newRoom = Object.values(state.roomMap).find(room => room.url === roomUrl);

  if (newRoom) {
    dispatch('changeDisplayedRoomById', newRoom.id);
  } else {
    // Fallback to just redirecting
    window.location.assign(roomUrl);
  }
};

export const jumpToMessageId = ({ commit, dispatch }, messageId) => {
  commit(types.CHANGE_HIGHLIGHTED_MESSAGE_ID, messageId);
  appEvents.trigger('vue:hightLightedMessageId', messageId);

  dispatch('trackStat', 'left-menu.search.messageNavigate');
};

export const upsertRoom = ({ commit }, newRoomState) => commit(types.UPDATE_ROOM, newRoomState);

export const addMessages = ({ commit }, messages) => {
  commit(types.ADD_TO_MESSAGE_MAP, messages);
};

export const removeMessage = ({ commit }, message) => {
  commit(types.REMOVE_MESSAGE, message);
};

export const joinRoom = async ({ commit, getters }) => {
  const isEmbedded = context().embedded;
  const welcomeMessage = getters.displayedRoom.meta && getters.displayedRoom.meta.welcomeMessage;
  // If the room has a welcome message then use normal browser navigation to show the welcome message modal(#welcome-message)
  // If the user is in an embedded view, just let them join without reading the welcome message
  if (welcomeMessage && !isEmbedded) {
    // Flows out to legacy backbone router to show welcome message modal
    window.location.assign('#welcome-message');
    return;
  }

  const roomPostOptions = {
    id: getters.displayedRoom.id,
    source: isEmbedded ? '~embed' : undefined
  };
  commit(joinRoomRequest.requestType);
  apiClient.user
    .post('/rooms', roomPostOptions)
    .then(body => {
      commit(joinRoomRequest.successType);
      context.setTroupe(body);
    })
    .catch(e => commit(joinRoomRequest.errorType, e));
};
