'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var assertUtils = require('../../assert-utils');
var env = require('gitter-web-env');
var nconf = env.config;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var serialize = require('gitter-web-serialization/lib/serialize');
var TroupeStrategy = testRequire('./serializers/rest/troupe-strategy');
var lazy = require('lazy.js');
var ObjectID = require('mongodb').ObjectID;

describe('TroupeStrategy', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    user2: {},
    troupe1: {
      users: ['user1'],
      // going with USER_CHANNEL rather than default of ORG so that some of the
      // tests below don't unnecessarily try to go down the github path.
      githubType: 'USER_CHANNEL',
      security: 'PUBLIC',
      lastAccessTime: new Date('2019')
    },
    troupe2: {
      oneToOne: true,
      users: ['user1', 'user2'],
      lastAccessTime: new Date('2019')
    },
    troupe3: {
      users: ['user1'],
      githubType: 'USER_CHANNEL',
      providers: ['github'],
      tags: ['foo'],
      security: 'PUBLIC'
    },
    troupeMeta1: {
      troupe: 'troupe1',
      welcomeMessage: 'hello'
    }
  });

  it('should serialize a troupe', function() {
    var strategy = new TroupeStrategy({});
    var t = fixture.troupe1;
    return serialize([t], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: t.id,
          name: t.uri,
          topic: '',
          avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + t.uri,
          uri: t.uri,
          oneToOne: false,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          public: true,
          v: 1
        }
      ]);
    });
  });

  it('should serialize a troupe with currentUserId', function() {
    var strategy = new TroupeStrategy({ currentUserId: fixture.user1._id });
    var t = fixture.troupe1;
    return serialize([t], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: t.id,
          name: t.uri,
          topic: '',
          avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + t.uri,
          uri: t.uri,
          oneToOne: false,
          userCount: 1,
          unreadItems: 0,
          mentions: 0,
          lastAccessTime: '2019-01-01T00:00:00.000Z',
          lurk: false,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          roomMember: true,
          public: true,
          v: 1
        }
      ]);
    });
  });

  it('should always serialize providers', function() {
    var strategy = new TroupeStrategy();
    var t = fixture.troupe3;
    return serialize([t], strategy).then(function(s) {
      assert.equal(s[0].providers[0], 'github');
    });
  });

  // TODO: includeGroups

  it('should serialize tags with includeTags', function() {
    var strategy = new TroupeStrategy({ includeTags: true });
    var t = fixture.troupe3;
    return serialize([t], strategy).then(function(s) {
      assert.equal(s[0].tags[0], 'foo');
    });
  });

  it('should serialize a one-to-one troupe with currentUserId', function() {
    var strategy = new TroupeStrategy({ currentUserId: fixture.user1._id });
    var u2 = fixture.user2;
    var t = fixture.troupe2;
    return serialize([t], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: t.id,
          name: u2.displayName,
          topic: '',
          avatarUrl: nconf.get('avatar:officialHost') + '/g/u/' + u2.username,
          uri: t.uri,
          oneToOne: true,
          userCount: 2,
          user: {
            id: u2.id,
            username: u2.username,
            displayName: u2.displayName,
            url: '/' + u2.username,
            avatarUrl: nconf.get('avatar:officialHost') + '/g/u/' + u2.username,
            avatarUrlSmall: '/api/private/user-avatar/' + u2.username + '?s=60',
            avatarUrlMedium: '/api/private/user-avatar/' + u2.username + '?s=128',
            staff: false,
            v: 1
          },
          unreadItems: 0,
          mentions: 0,
          lastAccessTime: '2019-01-01T00:00:00.000Z',
          lurk: false,
          url: '/' + u2.username,
          githubType: 'ONETOONE',
          noindex: false,
          roomMember: true,
          public: false,
          v: 1
        }
      ]);
    });
  });

  it('should skip unread counts with currentUserId and options.skipUnreadCounts', function() {
    var strategy = new TroupeStrategy({
      currentUserId: fixture.user1._id,
      skipUnreadCounts: true
    });
    var t = fixture.troupe1;
    return serialize([t], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: t.id,
          name: t.uri,
          topic: '',
          avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + t.uri,
          uri: t.uri,
          oneToOne: false,
          userCount: 1,
          lastAccessTime: '2019-01-01T00:00:00.000Z',
          lurk: false,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          roomMember: true,
          public: true,
          v: 1
        }
      ]);
    });
  });

  it('should include permissions with currentUser and includePermissions', function() {
    var user = fixture.user1;
    var strategy = new TroupeStrategy({
      currentUser: user,
      includePermissions: true
    });
    var t = fixture.troupe1;
    return serialize([t], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: t.id,
          name: t.uri,
          topic: '',
          avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + t.uri,
          uri: t.uri,
          oneToOne: false,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          permissions: {
            /*
            NOTE: this is kinda an artifact of how our fixtures work. We get
            admin false even though the one user in there should probably be
            the admin, but that's because (at the time of writing) the uri of a
            channel room has to start with the username of the user that made
            it for the user to be admin.. I started going down the rabbit hole
            of hacking the fixtures to work but realised that at that point
            I'm not testing the strategy at all, so just leaving this comment
            here and moving on.
            */
            admin: false
          },
          public: true,
          v: 1
        }
      ]);
    });
  });

  it('should include if an owner is an org with includeOwner', function() {
    var strategy = new TroupeStrategy({ includeOwner: true });
    var t = fixture.troupe1;
    return serialize([t], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: t.id,
          name: t.uri,
          topic: '',
          avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + t.uri,
          uri: t.uri,
          oneToOne: false,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          public: true,
          v: 1
        }
      ]);
    });
  });

  it('should include room membership with isRoomMember', function() {
    var strategy = new TroupeStrategy({ isRoomMember: true });
    var t = fixture.troupe1;
    return serialize([t], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: t.id,
          name: t.uri,
          topic: '',
          avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + t.uri,
          uri: t.uri,
          oneToOne: false,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          roomMember: true,
          public: true,
          v: 1
        }
      ]);
    });
  });

  describe('oneToOneOtherUserSequence', function() {
    var oneToOneOtherUserSequence = TroupeStrategy.testOnly.oneToOneOtherUserSequence;

    it('should deal with empty sequences', function() {
      var x = lazy([]);
      assert.deepEqual(oneToOneOtherUserSequence('1', x).toArray(), []);
    });

    it('should deal with non-one-to-one troupes sequences', function() {
      var x = lazy([
        {
          uri: 'x'
        },
        {
          uri: 'y'
        }
      ]);
      assert.deepEqual(oneToOneOtherUserSequence('1', x).toArray(), []);
    });

    it('should deal with one-to-one troupe sequences with strings', function() {
      var x = lazy([
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: '1'
            },
            {
              userId: '2'
            }
          ]
        },
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: '1'
            },
            {
              userId: '3'
            }
          ]
        }
      ]);
      assert.deepEqual(oneToOneOtherUserSequence('1', x).toArray(), ['2', '3']);
    });

    it('should deal with one-to-one troupe sequences with ObjectIds', function() {
      var o1 = new ObjectID();
      var o2 = new ObjectID();
      var o3 = new ObjectID();

      var x = lazy([
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: o1
            },
            {
              userId: o2
            }
          ]
        },
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: o1
            },
            {
              userId: o3
            }
          ]
        }
      ]);
      assert.deepEqual(oneToOneOtherUserSequence(o1, x).toArray(), [o2, o3]);
    });

    it('should deal with one-to-one troupe sequences with ObjectIds mixed, case 1', function() {
      var o1 = new ObjectID();
      var o2 = new ObjectID();
      var o3 = new ObjectID();

      var x = lazy([
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: o1
            },
            {
              userId: o2
            }
          ]
        },
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: o1
            },
            {
              userId: o3
            }
          ]
        }
      ]);
      assert.deepEqual(oneToOneOtherUserSequence(o1.toHexString(), x).toArray(), [o2, o3]);
    });

    it('should deal with one-to-one troupe sequences with ObjectIds mixed, case 1', function() {
      var o1 = new ObjectID();
      var o2 = new ObjectID().toHexString();
      var o3 = new ObjectID().toHexString();

      var x = lazy([
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: o1.toHexString()
            },
            {
              userId: o2
            }
          ]
        },
        {
          oneToOne: true,
          oneToOneUsers: [
            {
              userId: o1.toHexString()
            },
            {
              userId: o3
            }
          ]
        }
      ]);
      assert.deepEqual(oneToOneOtherUserSequence(o1, x).toArray(), [o2, o3]);
    });
  });
});
