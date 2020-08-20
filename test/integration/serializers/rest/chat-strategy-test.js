'use strict';

var testRequire = require('../../test-require');
var assertUtils = require('../../assert-utils');
const assert = require('assert');
var env = require('gitter-web-env');
var nconf = env.config;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var serialize = require('gitter-web-serialization/lib/serialize');
var ChatStrategy = testRequire('./serializers/rest/chat-strategy');
var ChatIdStrategy = testRequire('./serializers/rest/chat-id-strategy');

function makeHash() {
  var hash = {};
  for (var i = 0; i < arguments.length; i = i + 2) {
    hash[arguments[i]] = arguments[i + 1];
  }
  return hash;
}

describe('chat-strategy-test', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  var expected1, expectedAnonymous, expectedLeanTrue, expectedInitialId, expectedLookups;

  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    troupe1: { users: ['user1'] },
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      readBy: [],
      text: 'old_message',
      sent: new Date('2014-01-01T00:00:00.000Z')
    }
  });

  beforeEach(function() {
    expected1 = [
      {
        id: fixture.message1.id,
        text: 'old_message',
        sent: '2014-01-01T00:00:00.000Z',
        fromUser: {
          id: fixture.user1.id,
          username: fixture.user1.username,
          displayName: fixture.user1.displayName,
          url: '/' + fixture.user1.username,
          avatarUrl: nconf.get('avatar:officialHost') + '/g/u/' + fixture.user1.username,
          avatarUrlSmall: '/api/private/user-avatar/' + fixture.user1.username + '?s=60',
          avatarUrlMedium: '/api/private/user-avatar/' + fixture.user1.username + '?s=128',
          staff: false,
          v: 1
        },
        unread: false,
        readBy: 0,
        urls: [],
        mentions: [],
        issues: [],
        meta: [],
        v: 1
      }
    ];

    expectedAnonymous = [
      {
        id: fixture.message1.id,
        text: 'old_message',
        sent: '2014-01-01T00:00:00.000Z',
        fromUser: {
          id: fixture.user1.id,
          username: fixture.user1.username,
          displayName: fixture.user1.displayName,
          url: '/' + fixture.user1.username,
          avatarUrl: nconf.get('avatar:officialHost') + '/g/u/' + fixture.user1.username,
          avatarUrlSmall: '/api/private/user-avatar/' + fixture.user1.username + '?s=60',
          avatarUrlMedium: '/api/private/user-avatar/' + fixture.user1.username + '?s=128',
          staff: false,
          v: 1
        },
        unread: undefined,
        readBy: 0,
        urls: [],
        mentions: [],
        issues: [],
        meta: [],
        v: 1
      }
    ];

    expectedLeanTrue = [
      {
        id: fixture.message1.id,
        text: 'old_message',
        sent: '2014-01-01T00:00:00.000Z',
        fromUser: { id: fixture.user1.id, username: fixture.user1.username, v: 1 },
        unread: false,
        readBy: 0,
        v: 1
      }
    ];

    expectedInitialId = [
      {
        id: fixture.message1.id,
        text: 'old_message',
        sent: '2014-01-01T00:00:00.000Z',
        fromUser: {
          id: fixture.user1.id,
          username: fixture.user1.username,
          displayName: fixture.user1.displayName,
          url: '/' + fixture.user1.username,
          avatarUrl: nconf.get('avatar:officialHost') + '/g/u/' + fixture.user1.username,
          avatarUrlSmall: '/api/private/user-avatar/' + fixture.user1.username + '?s=60',
          avatarUrlMedium: '/api/private/user-avatar/' + fixture.user1.username + '?s=128',
          staff: false,
          v: 1
        },
        unread: undefined,
        readBy: 0,
        urls: [],
        initial: true,
        mentions: [],
        issues: [],
        meta: [],
        v: 1
      }
    ];

    expectedLookups = {
      items: [
        {
          id: fixture.message1.id,
          text: 'old_message',
          sent: '2014-01-01T00:00:00.000Z',
          fromUser: fixture.user1.id,
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: [],
          v: 1
        }
      ],
      lookups: {
        users: makeHash(fixture.user1.id, {
          id: fixture.user1.id,
          username: fixture.user1.username,
          displayName: fixture.user1.displayName,
          url: '/' + fixture.user1.username,
          avatarUrl: nconf.get('avatar:officialHost') + '/g/u/' + fixture.user1.username,
          avatarUrlSmall: '/api/private/user-avatar/' + fixture.user1.username + '?s=60',
          avatarUrlMedium: '/api/private/user-avatar/' + fixture.user1.username + '?s=128',
          staff: false,
          v: 1
        })
      }
    };
  });

  describe('chat-serializer', function() {
    it('should serialize a message', function() {
      var strategy = new ChatStrategy({
        currentUserId: fixture.user1.id,
        troupeId: fixture.troupe1.id
      });
      return serialize([fixture.message1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    // This case is not just for NLI users...
    //
    // We don't want to default to true/false because even when someone is signed in,
    // some places of code don't define `currentUserId`. We don't want to accidentally
    // override the actual value. See `live-collection-chats.js` as an example
    //
    // To give a scenario: if we default to `unread: false` for a signed in user, it can
    // screw up our assumptions on the frontend and keep messages from being marked
    // as read because they already appear to be marked as read.
    //
    // Full context: https://gitlab.com/gitlab-org/gitter/webapp/-/merge_requests/1871
    it(`when currentUserId is undefined, don't default the unread value to true/false (leads to frontend state mismatch problems)`, async () => {
      const strategy = new ChatStrategy({
        currentUserId: undefined,
        troupeId: fixture.troupe1.id
      });

      const serializedMessage = await serialize([fixture.message1], strategy);

      assertUtils.assertSerializedEqual(serializedMessage.unread, undefined);
    });

    describe('threadMessages', () => {
      const threadFixtures = fixtureLoader.setupEach({
        user1: {},
        troupe1: { users: ['user1'] },
        message1: {
          user: 'user1',
          troupe: 'troupe1',
          threadMessageCount: 7,
          text: 'A'
        },
        message2: {
          user: 'user1',
          troupe: 'troupe1',
          parent: 'message1',
          text: 'B'
        }
      });

      it('should propagate threadMessageCount attribute', async () => {
        const { message1, troupe1 } = threadFixtures;
        const strategy = new ChatStrategy({ currentUserId: null, troupeId: troupe1.id });
        const serialized = await serialize([message1], strategy);
        assert.equal(serialized[0].threadMessageCount, 7);
      });
      it('should propagate parentId attribute', async () => {
        const { message1, message2, troupe1 } = threadFixtures;
        const strategy = new ChatStrategy({ currentUserId: null, troupeId: troupe1.id });
        const serialized = await serialize([message2], strategy);
        assert.equal(serialized[0].parentId, message1.id);
      });
    });

    it('should serialize a message for anonymous', function() {
      var strategy = new ChatStrategy({ currentUserId: null, troupeId: fixture.troupe1.id });
      return serialize([fixture.message1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedAnonymous);
      });
    });

    it('should serialize a message with lean=true', function() {
      var strategy = new ChatStrategy({
        lean: true,
        currentUserId: fixture.user1.id,
        troupeId: fixture.troupe1.id
      });
      return serialize([fixture.message1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedLeanTrue);
      });
    });

    it('should serialize a message with an initialId', function() {
      var strategy = new ChatStrategy({ initialId: fixture.message1.id });
      return serialize([fixture.message1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedInitialId);
      });
    });

    it("should serialize a message with lookups=['user']", function() {
      var strategy = new ChatStrategy({
        lookups: ['user'],
        currentUserId: fixture.user1.id,
        troupeId: fixture.troupe1.id
      });
      return serialize([fixture.message1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedLookups);
      });
    });
  });

  describe('chat-id-serializer', function() {
    it('should serialize a message', function() {
      var strategy = new ChatIdStrategy({
        currentUserId: fixture.user1.id,
        troupeId: fixture.troupe1.id
      });
      return serialize([fixture.message1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a message for anonymous', function() {
      var strategy = new ChatIdStrategy({ currentUserId: null, troupeId: fixture.troupe1.id });
      return serialize([fixture.message1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedAnonymous);
      });
    });

    it('should serialize a message with lean=true', function() {
      var strategy = new ChatIdStrategy({
        lean: true,
        currentUserId: fixture.user1.id,
        troupeId: fixture.troupe1.id
      });
      return serialize([fixture.message1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedLeanTrue);
      });
    });

    it('should serialize a message with an initialId', function() {
      var strategy = new ChatIdStrategy({ initialId: fixture.message1.id });
      return serialize([fixture.message1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedInitialId);
      });
    });

    it("should serialize a message with lookups=['user']", function() {
      var strategy = new ChatIdStrategy({
        lookups: ['user'],
        currentUserId: fixture.user1.id,
        troupeId: fixture.troupe1.id
      });
      return serialize([fixture.message1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedLookups);
      });
    });
  });
});
