'use strict';

var testRequire = require('../../test-require');
var assertUtils = require('../../assert-utils');
var env = require('gitter-web-env');
var nconf = env.config;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var serialize = require('gitter-web-serialization/lib/serialize');
var GithubOrgStrategy = testRequire('./serializers/rest/github-org-strategy');

describe('GithubOrgStrategy', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    troupe1: {
      users: ['user1'],
      githubType: 'ORG',
      security: 'PUBLIC'
    }
  });

  it('should serialize an org with no room', function() {
    var org = {
      id: 1,
      login: 'foo',
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      absoluteUri: `https://github.com/foo`
    };

    var strategy = new GithubOrgStrategy({});
    return serialize([org], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          type: 'GH_ORG',
          id: org.id,
          name: org.login,
          avatar_url: org.avatar_url,
          uri: 'foo',
          absoluteUri: org.absoluteUri,
          room: null,
          premium: false
        }
      ]);
    });
  });

  it('should serialize an org with a room', function() {
    var org = {
      id: 1,
      login: fixture.troupe1.uri,
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      absoluteUri: `https://github.com/${fixture.troupe1.uri}`
    };

    var t = fixture.troupe1;

    var strategy = new GithubOrgStrategy({});
    return serialize([org], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          type: 'GH_ORG',
          id: org.id,
          name: org.login,
          avatar_url: org.avatar_url,
          uri: org.login,
          absoluteUri: org.absoluteUri,
          room: {
            id: t.id,
            name: t.uri,
            topic: '',
            avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + t.uri,
            uri: t.uri,
            oneToOne: false,
            userCount: 1,
            url: '/' + t.uri,
            githubType: 'ORG',
            security: 'PUBLIC',
            noindex: false,
            public: true,
            v: 1
          },
          premium: false
        }
      ]);
    });
  });
});
