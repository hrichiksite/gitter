import Vue from 'vue';
import * as types from './mutation-types';
import {
  roomSearchRepoRequest,
  roomSearchRoomRequest,
  roomSearchPeopleRequest,
  messageSearchRequest,
  joinRoomRequest
} from './requests';
import fuzzysearch from 'fuzzysearch';

/** Generates id for TMF child messages that have been sent but not yet stored in DB */
export function generateChildMessageTmpId(parentId, userId, text) {
  return `tmp-${parentId}-${userId}-${text.substring(0, 64)}`;
}

function roomFilter(searchTermInput = '', room) {
  const searchTerm = searchTermInput.toLowerCase();

  const name = (room.name || '').toLowerCase();
  const uri = (room.url || '').replace(/^\//, '').toLowerCase();

  return searchTerm.length > 0 && (fuzzysearch(searchTerm, name) || fuzzysearch(searchTerm, uri));
}

export default {
  [types.SET_INITIAL_DATA](state, data) {
    Object.assign(state, data);
  },

  [types.TOGGLE_DARK_THEME](state, newState) {
    state.darkTheme = newState;
  },

  [types.SWITCH_LEFT_MENU_STATE](state, newLeftMenuState) {
    state.leftMenuState = newLeftMenuState;
  },
  [types.TOGGLE_LEFT_MENU_PINNED_STATE](state, newPinnedState) {
    state.leftMenuPinnedState = newPinnedState;
    // Always collapse when you unpinning
    // When the menu is pinned, the expanded state has no effect (always fully shown when pinned)
    state.leftMenuExpandedState = false;
  },
  [types.TOGGLE_LEFT_MENU](state, newToggleState) {
    state.leftMenuExpandedState = newToggleState;
  },

  [types.UPDATE_FAVOURITE_DRAGGING_STATE](state, newToggleState) {
    state.favouriteDraggingInProgress = newToggleState;
  },
  [types.REQUEST_ROOM_FAVOURITE](state, roomId) {
    const resultantRoomState = { ...state.roomMap[roomId], error: false, loading: true };
    Vue.set(state.roomMap, roomId, resultantRoomState);
  },
  [types.RECEIVE_ROOM_FAVOURITE_SUCCESS](state, roomId) {
    const resultantRoomState = { ...state.roomMap[roomId], error: false, loading: false };
    Vue.set(state.roomMap, roomId, resultantRoomState);
  },
  [types.RECEIVE_ROOM_FAVOURITE_ERROR](state, { id: roomId, error = true }) {
    const resultantRoomState = { ...state.roomMap[roomId], error, loading: false };
    Vue.set(state.roomMap, roomId, resultantRoomState);
  },

  [types.UPDATE_SEARCH_INPUT_VALUE](state, newSearchInputValue) {
    state.search.searchInputValue = newSearchInputValue;
  },
  [types.SEARCH_CLEARED](state) {
    state.search.current.results = [];
    state.search.repo = { loading: false, error: false, results: [] };
    state.search.room = { loading: false, error: false, results: [] };
    state.search.people = { loading: false, error: false, results: [] };
    state.search.message = { loading: false, error: false, results: [] };
  },
  [types.UPDATE_ROOM_SEARCH_CURRENT](state) {
    state.search.current.results = Object.keys(state.roomMap).filter(roomId =>
      roomFilter(state.search.searchInputValue, state.roomMap[roomId])
    );
  },

  ...roomSearchRepoRequest.mutations,

  ...roomSearchRoomRequest.mutations,

  ...roomSearchPeopleRequest.mutations,

  ...messageSearchRequest.mutations,

  ...joinRoomRequest.mutations,

  [types.CHANGE_DISPLAYED_ROOM](state, newRoomId) {
    state.displayedRoomId = newRoomId;
    state.hightLightedMessageId = null;
  },
  [types.CHANGE_HIGHLIGHTED_MESSAGE_ID](state, newMessageId) {
    state.hightLightedMessageId = newMessageId;
  },

  [types.UPDATE_ROOM](state, newRoomState) {
    if (newRoomState.id) {
      const resultantRoomState = Object.assign(
        {},
        state.roomMap[newRoomState.id] || {},
        newRoomState
      );
      Vue.set(state.roomMap, newRoomState.id, resultantRoomState);
    }
  },
  [types.ADD_TO_MESSAGE_MAP](state, messages) {
    messages.forEach(message => {
      if (message.parentId) {
        const tempId = generateChildMessageTmpId(
          message.parentId,
          message.fromUser.id,
          message.text
        );
        Vue.delete(state.messageMap, tempId);
      }
      Vue.set(state.messageMap, message.id, message);
    });
  },
  [types.REMOVE_MESSAGE](state, message) {
    Vue.delete(state.messageMap, message.id);
  },
  [types.UPDATE_MESSAGE](state, newMessageState) {
    const { id } = newMessageState;
    if (!id) return;
    const oldMessage = state.messageMap[id] || {};
    Vue.set(state.messageMap, id, { ...oldMessage, ...newMessageState });
  }
};
