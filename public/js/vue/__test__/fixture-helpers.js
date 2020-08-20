function createSerializedGroupFixture(uri, overrides) {
  return {
    id: `5e6091d591d1aa092b928bc7-${uri}`,
    name: uri,
    uri,
    homeUri: `${uri}/home`,
    backedBy: {
      type: 'GL_GROUP',
      linkPath: uri
    },
    avatarUrl: 'http://localhost:5000/api/private/avatars/group/iv/1/5e6091d591d1aa092b928bc7',
    ...overrides
  };
}

function createSerializedRoomFixture(uri, overrides) {
  return {
    id: `5a8739841543b98772a686a9-${uri}`,
    name: uri,
    topic: 'You should read our rules',
    avatarUrl: 'http://localhost:5000/api/private/avatars/group/i/5a8739841543b98772a686a8',
    uri: uri,
    oneToOne: false,
    userCount: 1,
    unreadItems: 0,
    mentions: 0,
    lastAccessTime: '2019-05-28T15:33:05.508Z',
    lurk: false,
    url: `/${uri}`,
    githubType: 'REPO_CHANNEL',
    security: 'PUBLIC',
    noindex: false,
    tags: [],
    roomMember: true,
    groupId: '5a8739841543b98772a686a8',
    public: true,
    ...overrides
  };
}

function createSerializedOneToOneRoomFixture(username) {
  return {
    id: `5c17fc82b799f1de19e23f15-${username}`,
    name: `${username}`,
    topic: '',
    avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/4/EricGitterTester',
    oneToOne: true,
    userCount: 2,
    user: {
      id: '5b4d086e0ba77d2371a8df5a',
      username: `${username}`,
      displayName: `${username}`,
      url: `/${username}`,
      avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/4/EricGitterTester',
      avatarUrlSmall: 'https://avatars2.githubusercontent.com/u/18617621?v=4&s=60',
      avatarUrlMedium: 'https://avatars2.githubusercontent.com/u/18617621?v=4&s=128',
      v: 20,
      gv: '4'
    },
    unreadItems: 0,
    mentions: 0,
    lastAccessTime: '2019-05-25T07:38:29.610Z',
    lurk: false,
    url: `/${username}`,
    githubType: 'ONETOONE',
    noindex: false,
    tags: [],
    roomMember: true,
    groupId: null,
    public: false
  };
}

function createSerializedUserFixture(overrides) {
  return {
    id: '5cdc09f6572f607a5bc8a41d',
    username: 'viktomas_gitlab',
    displayName: 'Tomas Vik',
    url: '/viktomas_gitlab',
    avatarUrl: 'http://localhost:5000/api/private/avatars/g/u/viktomas_gitlab',
    avatarUrlSmall:
      'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=60&d=identicon',
    avatarUrlMedium:
      'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=128&d=identicon',
    v: 34,
    ...overrides
  };
}

// We use this to make the ID unique
let messageSearchResultIncrement = 0;
function createSerializedMessageSearchResultFixture() {
  messageSearchResultIncrement++;

  return {
    id: `573bd813e2996a5a42c95899-${messageSearchResultIncrement}`,
    text:
      "@MadLittleMods For some groups it might not matter much, but for others a lot.  Kinda like stack overflows 'take this offline' thing when you start doing a conversation in the comments.  Im' sure it's not simple to design",
    html:
      '<span data-link-type="mention" data-screen-name="MadLittleMods" class="mention">@MadLittleMods</span> For some groups it might not matter much, but for others a lot.  Kinda like stack overflows &#39;take this offline&#39; thing when you start doing a conversation in the comments.  Im&#39; sure it&#39;s not simple to design',
    sent: '2016-05-18T02:48:51.386Z',
    fromUser: createSerializedUserFixture(),
    unread: false,
    readBy: 40,
    urls: [],
    mentions: [
      {
        screenName: 'MadLittleMods',
        userId: '553d437215522ed4b3df8c50',
        userIds: []
      }
    ],
    issues: [],
    meta: [],
    highlights: ['offline'],
    v: 1
  };
}

function createSerializedMessageFixture(overrides) {
  return {
    id: '5d147ea84dad9dfbc522317a',
    text:
      '@MadLittleMods Example message using a bit of  `code` and **bold** to show how *markdown* is stored.',
    html:
      '<span data-link-type="mention" data-screen-name="MadLittleMods" class="mention">@MadLittleMods</span>  Example message using a bit of  <code>code</code> and <strong>bold</strong> to show how <em>markdown</em> is stored.',
    sent: '2016-05-18T02:48:51.386Z',
    fromUser: createSerializedUserFixture(),
    unread: false,
    readBy: 1,
    urls: [],
    mentions: [
      {
        screenName: 'MadLittleMods',
        userId: '553d437215522ed4b3df8c50',
        userIds: []
      }
    ],
    issues: [],
    meta: [],
    v: 1,
    burstStart: true,
    ...overrides
  };
}

function createOrgGitlabGroupFixture(uri) {
  return {
    type: 'GL_GROUP',
    id: `123-${uri}`,
    name: uri,
    avatar_url:
      'https://assets.gitlab-static.net/uploads/-/system/group/avatar/1540914/icon_128x128.png',
    uri,
    absoluteUri: `https://gitlab.com/groups/${uri}`
  };
}

function createRepoGitlabProjectFixture(uri) {
  return {
    type: 'GL_PROJECT',
    id: `123-${uri}`,
    name: uri,
    absoluteUri: `https://gitlab.com/${uri}`,
    uri,
    avatar_url: null
  };
}

function createOrgGithubOrgFixture(uri) {
  return {
    type: 'GH_ORG',
    id: `1086321-${uri}`,
    name: uri,
    avatar_url: 'https://avatars2.githubusercontent.com/u/1086321?v=4',
    uri,
    absoluteUri: `https://github.com/${uri}`
  };
}

function createRepoGithubRepoFixture(uri) {
  return {
    type: 'GH_REPO',
    id: `14863998-${uri}`,
    name: uri,
    description: `Some repo for my project ${uri}`,
    absoluteUri: `https://github.com/${uri}`,
    uri,
    private: false,
    exists: false,
    avatar_url: 'https://avatars0.githubusercontent.com/u/5990364?v=4'
  };
}

module.exports = {
  createSerializedGroupFixture,
  createSerializedRoomFixture,
  createSerializedOneToOneRoomFixture,
  createSerializedMessageFixture,
  createSerializedMessageSearchResultFixture,
  createSerializedUserFixture,

  createOrgGitlabGroupFixture,
  createRepoGitlabProjectFixture,
  createOrgGithubOrgFixture,
  createRepoGithubRepoFixture
};
