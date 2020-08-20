'use strict';

var testRequire = require('../../test-require');
var assertUtils = require('../../assert-utils');
var env = require('gitter-web-env');
var nconf = env.config;
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var serialize = require('gitter-web-serialization/lib/serialize');
var GithubRepoStrategy = testRequire('./serializers/rest/github-repo-strategy');

describe('GithubRepoStrategy', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    troupe1: {
      users: ['user1'],
      githubType: 'REPO',
      security: 'PUBLIC'
    }
  });

  it('should serialize a repo that does not have a room', function() {
    var repo = {
      id: 1,
      full_name: 'abc_/123',
      description: 'do re me',
      private: false,
      owner: {
        avatar_url: 'https://github.com/images/error/octocat_happy.gif'
      }
    };

    var strategy = new GithubRepoStrategy({});
    return serialize([repo], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          type: 'GH_REPO',
          id: repo.id,
          name: repo.full_name,
          description: repo.description,
          absoluteUri: 'https://github.com/abc_/123',
          uri: repo.full_name,
          private: false,
          exists: false,
          avatar_url: repo.owner.avatar_url
        }
      ]);
    });
  });

  it('should serialize a repo that has a room', function() {
    var repo = {
      id: 1,
      full_name: fixture.troupe1.uri,
      description: 'this one has a room',
      private: false,
      owner: {
        avatar_url: 'https://github.com/images/error/octocat_happy.gif'
      }
    };

    var t = fixture.troupe1;

    var strategy = new GithubRepoStrategy({});
    return serialize([repo], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          type: 'GH_REPO',
          id: repo.id,
          name: repo.full_name,
          description: repo.description,
          absoluteUri: `https://github.com/${repo.full_name}`,
          uri: repo.full_name,
          private: false,
          room: {
            id: t.id,
            name: t.uri,
            topic: '',
            avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + getOrgNameFromUri(t.uri),
            uri: t.uri,
            // NOTE: Why false here, but undefined in troupe-strategy-test.js?
            // Probably because it is being loaded from the database by
            // GithubRepoStrategy's preload whereas in the troupe strategy
            // tests it comes straight from the fixture.
            oneToOne: false,
            userCount: 1,
            url: '/' + t.uri,
            githubType: 'REPO',
            security: 'PUBLIC',
            noindex: false,
            public: true,
            v: 1
          },
          exists: true,
          avatar_url: repo.owner.avatar_url
        }
      ]);
    });
  });
});
