import _ from 'lodash';
import { pojo as sortsAndFilters } from 'gitter-realtime-client/lib/sorts-filters';

export const hasProvider = state => provider => {
  const user = state.user;
  return !!(user && user.providers && user.providers.includes(provider));
};

// Get the GitLab, Twitter, GitHub username, given a user's Gitter username,
// Since Gitter usernames are derived from the identity a user signs in with, we can derive thsi information
// But in the futurem we should get this from the identity itself in the future
export const identityUsername = state => {
  const user = state.user;

  if (hasProvider(state)('gitlab')) {
    const gitlabUsername = user.username.replace(/_gitlab$/, '');
    return gitlabUsername;
  } else if (hasProvider(state)('twitter')) {
    const gitlabUsername = user.username.replace(/_twitter$/, '');
    return gitlabUsername;
  }

  return user.username;
};

function sortRooms(a, b) {
  if (a.favourite || b.favourite) {
    return sortsAndFilters.favourites.sort(a, b);
  }

  return sortsAndFilters.recents.sort(a, b);
}

export const displayedRoom = state => {
  return state.roomMap[state.displayedRoomId];
};

export const displayedRooms = state => {
  let resultantRooms = [];

  if (state.leftMenuState === 'people') {
    resultantRooms = Object.keys(state.roomMap)
      .filter(roomKey => state.roomMap[roomKey].oneToOne)
      .map(roomKey => state.roomMap[roomKey]);
  } else {
    resultantRooms = Object.keys(state.roomMap).map(roomKey => state.roomMap[roomKey]);
  }

  resultantRooms = resultantRooms.filter(sortsAndFilters.leftMenu.filter);
  resultantRooms.sort(sortRooms);

  return resultantRooms;
};

export const isDisplayedRoomAdmin = state => {
  const room = displayedRoom(state);
  return room.permissions && room.permissions.admin === true;
};

export const hasAnyUnreads = state => {
  return Object.values(state.roomMap).some(room => room.unreadItems > 0);
};
export const hasAnyMentions = state => {
  return Object.values(state.roomMap).some(room => room.mentions > 0);
};
export const hasPeopleUnreads = state => {
  return Object.values(state.roomMap).some(
    room => room.oneToOne && (room.unreadItems > 0 || room.mentions > 0)
  );
};

export const displayedRoomSearchResults = state => {
  const allResults = [
    ...state.search.current.results,
    ...state.search.repo.results,
    ...state.search.room.results,
    ...state.search.people.results
  ];

  const uniqueResults = _.uniq(allResults);
  return uniqueResults.slice(0, 6).map(roomId => state.roomMap[roomId]);
};
