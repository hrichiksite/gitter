const _ = require('lodash');
const createState = require('./state').default;
const getters = require('./getters');

const {
  createSerializedUserFixture,
  createSerializedRoomFixture,
  createSerializedOneToOneRoomFixture
} = require('../__test__/fixture-helpers');

describe('getters', () => {
  let state;
  beforeEach(() => {
    state = createState();
  });

  describe('hasProvider', () => {
    it('detects GitHub user', () => {
      const state = {
        user: createSerializedUserFixture({ providers: ['github'] })
      };
      const result = getters.hasProvider(state)('github');
      expect(result).toEqual(true);
    });

    it('detects GitLab user', () => {
      const state = {
        user: createSerializedUserFixture({ providers: ['gitlab'] })
      };
      const result = getters.hasProvider(state)('gitlab');
      expect(result).toEqual(true);
    });

    it('GitLab user does not trigger when looking for GitHub', () => {
      const state = {
        user: createSerializedUserFixture({ providers: ['gitlab'] })
      };
      const result = getters.hasProvider(state)('github');
      expect(result).toEqual(false);
    });

    it('No providers does not trigger when looking for GitHub', () => {
      const state = {
        user: createSerializedUserFixture()
      };
      const result = getters.hasProvider(state)('github');
      expect(result).toEqual(false);
    });
  });

  describe('identityUsername', () => {
    it('gets GitLab username', () => {
      const state = {
        user: createSerializedUserFixture({
          username: 'some-gl-username_gitlab',
          providers: ['gitlab']
        })
      };
      const result = getters.identityUsername(state);
      expect(result).toStrictEqual('some-gl-username');
    });

    it('gets GitHub username', () => {
      const state = {
        user: createSerializedUserFixture({
          username: 'some-gh-username',
          providers: ['github']
        })
      };
      const result = getters.identityUsername(state);
      expect(result).toStrictEqual('some-gh-username');
    });

    it('gets Twitter username', () => {
      const state = {
        user: createSerializedUserFixture({
          username: 'some-tw-username',
          providers: ['twitter']
        })
      };
      const result = getters.identityUsername(state);
      expect(result).toStrictEqual('some-tw-username');
    });
  });

  describe('displayedRoom', () => {
    it('non-existent room is undefined', () => {
      state.displayedRoomId = '000';

      const displayedRoom = getters.displayedRoom(state);
      expect(displayedRoom).toEqual(undefined);
    });

    it('returns full room object for displayedRoomId', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: room1
      };

      state.displayedRoomId = room1.id;

      const displayedRoom = getters.displayedRoom(state);
      expect(displayedRoom).toEqual(room1);
    });
  });

  describe('displayedRooms', () => {
    it('when the user has not joined any rooms yet, then no rooms to display', () => {
      state.leftMenuState = 'all';

      const displayedRooms = getters.displayedRooms(state);
      expect(displayedRooms).toEqual([]);
    });

    it('when the left-menu is in "All conversations" state, shows all rooms', () => {
      state.leftMenuState = 'all';

      const room1 = createSerializedRoomFixture('community/room1');
      const room2 = createSerializedRoomFixture('community/room2');
      const oneToOneRoom1 = createSerializedOneToOneRoomFixture('onetoone/room1');
      state.roomMap = {
        [room1.id]: room1,
        [room2.id]: room2,
        [oneToOneRoom1.id]: oneToOneRoom1
      };

      const displayedRooms = getters.displayedRooms(state);
      expect(displayedRooms).toEqual([room1, room2, oneToOneRoom1]);
    });

    it('when the left-menu is in "People"/one to one rooms state, only shows one to one rooms', () => {
      state.leftMenuState = 'people';

      const room1 = createSerializedRoomFixture('community/room1');
      const room2 = createSerializedRoomFixture('community/room2');
      const oneToOneRoom1 = createSerializedOneToOneRoomFixture('onetoone/room1');
      state.roomMap = {
        [room1.id]: room1,
        [room2.id]: room2,
        [oneToOneRoom1.id]: oneToOneRoom1
      };

      const displayedRooms = getters.displayedRooms(state);
      expect(displayedRooms).toEqual([oneToOneRoom1]);
    });

    it('does not show rooms that came from search results', () => {
      state.leftMenuState = 'all';

      const room1 = createSerializedRoomFixture('community/room1');
      const room2 = createSerializedRoomFixture('community/room2');
      const oneToOneRoom1 = createSerializedOneToOneRoomFixture('onetoone/room1');

      const repoRoomResult1 = _.omit(createSerializedRoomFixture('github-org/repo1'), [
        'lastAccessTime',
        'roomMember'
      ]);

      const roomResult1 = _.omit(createSerializedRoomFixture('community/not-joined1'), [
        'lastAccessTime',
        'roomMember'
      ]);

      const oneToOneResult1 = {
        avatarUrl: 'https://avatars-04.gitter.im/gh/uv/4/JORGE-ASDF',
        avatarUrlMedium: 'https://avatars2.githubusercontent.com/u/51345323?v=4&s=128',
        avatarUrlSmall: 'https://avatars2.githubusercontent.com/u/51345323?v=4&s=60',
        displayName: 'some-buddy1',
        gv: '4',
        id: '5cf6a2f5d72222ce4fc22a22',
        url: '/some-buddy1',
        username: 'some-buddy1',
        v: 1
      };

      state.roomMap = {
        [room1.id]: room1,
        [room2.id]: room2,
        [oneToOneRoom1.id]: oneToOneRoom1,

        [repoRoomResult1.id]: repoRoomResult1,
        [roomResult1.id]: roomResult1,
        [oneToOneResult1.id]: oneToOneResult1
      };

      const displayedRooms = getters.displayedRooms(state);
      expect(displayedRooms).toEqual([room1, room2, oneToOneRoom1]);
    });
  });

  it('isDisplayedRoomAdmin returns true if user has admin permissions to displayed room', () => {
    const room1 = createSerializedRoomFixture('community/room1', { permissions: { admin: true } });
    state.roomMap = {
      [room1.id]: room1
    };
    state.displayedRoomId = room1.id;
    expect(getters.isDisplayedRoomAdmin(state)).toEqual(true);
  });
  describe('hasAnyUnreads', () => {
    it('no unreads returns false', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: room1
      };

      const hasAnyUnreads = getters.hasAnyUnreads(state);
      expect(hasAnyUnreads).toEqual(false);
    });

    it('some unreads returns true', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      const room2 = {
        ...createSerializedRoomFixture('community/room2'),
        unreadItems: 3
      };
      const room3 = createSerializedRoomFixture('community/room3');
      state.roomMap = {
        [room1.id]: room1,
        [room2.id]: room2,
        [room3.id]: room3
      };

      const hasAnyUnreads = getters.hasAnyUnreads(state);
      expect(hasAnyUnreads).toEqual(true);
    });
  });

  describe('hasAnyMentions', () => {
    it('no mentions returns false', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: room1
      };

      const hasAnyMentions = getters.hasAnyMentions(state);
      expect(hasAnyMentions).toEqual(false);
    });

    it('some mentions returns true', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      const room2 = {
        ...createSerializedRoomFixture('community/room2'),
        mentions: 3
      };
      const room3 = createSerializedRoomFixture('community/room3');
      state.roomMap = {
        [room1.id]: room1,
        [room2.id]: room2,
        [room3.id]: room3
      };

      const hasAnyMentions = getters.hasAnyMentions(state);
      expect(hasAnyMentions).toEqual(true);
    });
  });

  describe('hasPeopleUnreads', () => {
    it('no unreads returns false', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      const oneToOneRoom1 = {
        ...createSerializedOneToOneRoomFixture('some-person1')
      };
      state.roomMap = {
        [room1.id]: room1,
        [oneToOneRoom1.id]: oneToOneRoom1
      };

      const hasPeopleUnreads = getters.hasPeopleUnreads(state);
      expect(hasPeopleUnreads).toEqual(false);
    });

    it('some unreads returns true', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      const oneToOneRoom1 = {
        ...createSerializedOneToOneRoomFixture('some-person1'),
        unreadItems: 3
      };
      const room3 = createSerializedRoomFixture('community/room3');
      state.roomMap = {
        [room1.id]: room1,
        [oneToOneRoom1.id]: oneToOneRoom1,
        [room3.id]: room3
      };

      const hasPeopleUnreads = getters.hasPeopleUnreads(state);
      expect(hasPeopleUnreads).toEqual(true);
    });

    it('some mentions returns true', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      const oneToOneRoom1 = {
        ...createSerializedOneToOneRoomFixture('some-person1'),
        mentions: 3
      };
      const room3 = createSerializedRoomFixture('community/room3');
      state.roomMap = {
        [room1.id]: room1,
        [oneToOneRoom1.id]: oneToOneRoom1,
        [room3.id]: room3
      };

      const hasPeopleUnreads = getters.hasPeopleUnreads(state);
      expect(hasPeopleUnreads).toEqual(true);
    });
  });

  describe('displayedRoomSearchResults', () => {
    it('deduplicates room search combined results matches snapshot', () => {
      const room1 = createSerializedRoomFixture('community/repo1');

      state.roomMap = {
        [room1.id]: room1
      };

      state.search.current.results = [room1.id];
      state.search.repo.results = [room1.id];
      state.search.room.results = [room1.id];

      const displayedRoomSearchResults = getters.displayedRoomSearchResults(state);
      expect(displayedRoomSearchResults).toEqual([room1]);
    });

    it('displays a maximum of 6 rooms', () => {
      state.search.current.results = [
        createSerializedRoomFixture('community/room1').id,
        createSerializedRoomFixture('community/room2').id,
        createSerializedRoomFixture('community/room3').id,
        createSerializedRoomFixture('community/room4').id,
        createSerializedRoomFixture('community/room6').id,
        createSerializedRoomFixture('community/room7').id,
        createSerializedRoomFixture('community/room8').id,
        createSerializedRoomFixture('community/room9').id
      ];

      const displayedRoomSearchResults = getters.displayedRoomSearchResults(state);
      expect(displayedRoomSearchResults.length).toEqual(6);
    });
  });
});
