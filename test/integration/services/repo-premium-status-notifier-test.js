'use strict';

var testRequire = require('../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var repoPremiumStatusNotifier = testRequire('./services/repo-premium-status-notifier');

describe('repo-premium-status-notifier', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    troupeOrg1: {
      githubType: 'ORG',
      users: ['user1', 'user2']
    }
  });

  it('should work with users on', function(done) {
    repoPremiumStatusNotifier(fixture.user1.username, true).nodeify(done);
  });

  it('should work with users off', function(done) {
    repoPremiumStatusNotifier(fixture.user1.username, false).nodeify(done);
  });

  it('should work with orgs on #slow', function(done) {
    repoPremiumStatusNotifier('gitterHQ', true).nodeify(done);
  });

  it('should work with users off #slow', function(done) {
    repoPremiumStatusNotifier('gitterHQ', false).nodeify(done);
  });
});
