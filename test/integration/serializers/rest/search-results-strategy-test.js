'use strict';

var testRequire = require('../../test-require');
var assertUtils = require('../../assert-utils');
var env = require('gitter-web-env');
var nconf = env.config;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var serialize = require('gitter-web-serialization/lib/serialize');
var SearchResultsStrategy = testRequire('./serializers/rest/search-results-strategy');
var TroupeStrategy = testRequire('./serializers/rest/troupe-strategy');

/*
At the time of writing, resultItemStrategy is only ever GithubRepoStrategy,
UserStrategy or TroupeStrategy. All three of those have tests, so I'm just
going to test with one of them because as long as SearchResultsStrategy works
and they all work, then the combinations should all work.
*/

describe('SearchResultsStrategy', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    troupe1: {
      users: ['user1'],
      githubType: 'USER_CHANNEL',
      security: 'PUBLIC'
    }
  });

  it('should serialize with just results', function() {
    var t = fixture.troupe1;
    var result = {
      results: [t]
    };

    var strategy = new SearchResultsStrategy({
      resultItemStrategy: new TroupeStrategy({})
    });
    return serialize([result], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          results: [
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
          ]
        }
      ]);
    });
  });

  it('should serialize with results and pagination', function() {
    var t = fixture.troupe1;
    var result = {
      results: [t],
      hasMoreResults: false,
      limit: 100,
      skip: 0
    };

    var strategy = new SearchResultsStrategy({
      resultItemStrategy: new TroupeStrategy({})
    });
    return serialize([result], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          hasMoreResults: false,
          limit: 100,
          skip: 0,
          results: [
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
          ]
        }
      ]);
    });
  });
});
