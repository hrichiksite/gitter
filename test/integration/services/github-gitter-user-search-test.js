'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var fakeUser = { username: 'fake-user', id: 'abc123' };

describe('github-gitter-user-search', function() {
  it('puts gitter connections above strangers', function(done) {
    var search = createSearchWithStubData({
      gitter: [{ username: 'gitter-friend', id: '123456' }],
      github: [{ login: 'some-github-user' }],
      userService: { 'gitter-friend': '123456' }
    });

    search('something', fakeUser)
      .then(function(data) {
        var list = getResults(data);

        assert.deepEqual(list, [
          { username: 'gitter-friend', id: '123456' },
          { username: 'some-github-user' }
        ]);
      })
      .nodeify(done);
  });

  it('removes duplicate github users', function(done) {
    var search = createSearchWithStubData({
      gitter: [{ username: 'gitter-friend', id: '123456' }],
      github: [{ login: 'gitter-friend' }],
      userService: { 'gitter-friend': '123456' }
    });

    search('something', fakeUser)
      .then(function(data) {
        var list = getResults(data);

        assert.deepEqual(list, [{ username: 'gitter-friend', id: '123456' }]);
      })
      .nodeify(done);
  });

  it('doesnt include yourself', function(done) {
    var search = createSearchWithStubData({
      gitter: [{ username: 'me', id: '123456' }],
      github: [{ login: 'me' }],
      userService: { me: 'abc123' }
    });

    search('something', { username: 'me', id: '123456' })
      .then(function(data) {
        var list = getResults(data);

        assert.deepEqual(list, []);
      })
      .nodeify(done);
  });

  describe('adding gitter metatdata to github users', function() {
    it('adds metatdata to a single matching github user', function(done) {
      var search = createSearchWithStubData({
        gitter: [],
        github: [{ login: 'gitter-user' }],
        userService: { 'gitter-user': 'testid' }
      });

      search('include-self', fakeUser)
        .then(function(data) {
          var list = getResults(data);

          assert.deepEqual(list, [{ username: 'gitter-user', id: 'testid' }]);
        })
        .nodeify(done);
    });

    it('handles sparse matches correctly', function(done) {
      var search = createSearchWithStubData({
        gitter: [],
        github: [{ login: 'not-on-gitter' }, { login: 'on-gitter' }],
        userService: { 'on-gitter': 'testid' }
      });

      search('something', fakeUser)
        .then(function(data) {
          var list = getResults(data);

          assert.deepEqual(list, [
            { username: 'not-on-gitter' },
            { username: 'on-gitter', id: 'testid' }
          ]);
        })
        .nodeify(done);
    });
  });

  describe('end-to-end #slow', function() {
    fixtureLoader.ensureIntegrationEnvironment('#integrationUser1');
    var fixture = fixtureLoader.setup({
      user1: '#integrationUser1'
    });

    var search = testRequire('./services/github-gitter-user-search');

    it('should find users', function() {
      return search('Andrew Newdigate', fixture.user1).then(function(data) {
        assert(
          data.results.some(function(user) {
            return user.username === 'suprememoocow';
          })
        );
      });
    });

    it('should find with reserved words', function() {
      return search('AND', fixture.user1);
    });
  });
});

function createSearchWithStubData(data) {
  return testRequire.withProxies('./services/github-gitter-user-search', {
    './user-search-service': createFakeGitterSearch(data.gitter),
    'gitter-web-github': {
      GitHubFastSearch: createFakeGithubSearch(data.github)
    },
    'gitter-web-users': createFakeUserService(data.userService)
  });
}

function createFakeGitterSearch(users) {
  return {
    searchForUsers: function() {
      return Promise.resolve({ results: users });
    }
  };
}

function createFakeGithubSearch(users) {
  var FakeGithubSearch = function() {};
  FakeGithubSearch.prototype.findUsers = function() {
    return Promise.resolve(users);
  };
  return FakeGithubSearch;
}

function createFakeUserService(usermap) {
  return {
    githubUsersExists: function() {
      return Promise.resolve(usermap);
    },
    findByUsernames: function(usernames) {
      return Promise.try(function() {
        return usernames.map(function(username) {
          return {
            id: usermap[username],
            username: username
          };
        });
      });
    }
  };
}

function getResults(data) {
  return data.results.map(function(user) {
    var newuser = {
      username: user.username
    };

    if (user.id) {
      newuser.id = user.id;
    }
    return newuser;
  });
}
