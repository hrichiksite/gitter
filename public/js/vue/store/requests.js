import VuexApiRequest from './vuex-api-request';

export const roomSearchRepoRequest = new VuexApiRequest('ROOM_SEARCH_REPO', 'search.repo');
export const roomSearchRoomRequest = new VuexApiRequest('ROOM_SEARCH_ROOM', 'search.room');
export const roomSearchPeopleRequest = new VuexApiRequest('ROOM_SEARCH_PEOPLE', 'search.people');
export const messageSearchRequest = new VuexApiRequest('MESSAGE_SEARCH', 'search.message');
export const joinRoomRequest = new VuexApiRequest('JOIN_ROOM', 'joinRoomRequest');
