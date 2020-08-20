/* global describe:true, it:true */
'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require('proxyquire').noCallThru();
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-members #github', function() {
  describe('mocks', function() {
    it('throws if there isnt a proper githubType', function(done) {
      var githubMembers = require('..').GitHubMembers;

      githubMembers.getMembers('gitterHQ').catch(function(err) {
        assert(err);
        done();
      });
    });

    describe('repo members', function() {
      var FakeRepoService = function() {};
      FakeRepoService.prototype.getCollaborators = function() {
        return Promise.resolve([{ login: 'alice' }, { login: 'bob' }]);
      };
      FakeRepoService.prototype.isCollaborator = function(uri) {
        assert.strictEqual('gitterHQ/gitter', uri);
        return Promise.resolve(true);
      };

      var githubMembers = proxyquireNoCallThru('../lib/github-members', {
        './github-repo-service': FakeRepoService
      });

      it('gets the members of a repo', function(done) {
        githubMembers
          .getMembers('gitterHQ/gitter', 'REPO', { githubToken: 'i am a token' })
          .then(function(members) {
            assert.deepEqual(members, ['alice', 'bob']);
          })
          .nodeify(done);
      });

      it('checks if a username is a member of a repo', function(done) {
        githubMembers
          .isMember('alice', 'gitterHQ/gitter', 'REPO', { githubToken: 'i am a token' })
          .then(function(isMember) {
            assert(isMember);
          })
          .nodeify(done);
      });
    });

    describe('org members', function() {
      var FakeOrgService = function() {};
      FakeOrgService.prototype.member = function(uri, username) {
        assert.strictEqual(uri, 'gitterHQ');
        assert.strictEqual('alice', username);
        return Promise.resolve(true);
      };
      FakeOrgService.prototype.members = function(uri) {
        assert.strictEqual(uri, 'gitterHQ');
        return Promise.resolve([{ login: 'alice' }, { login: 'bob' }]);
      };

      var FakeMeService = function() {};
      FakeMeService.prototype.isOrgMember = function(uri) {
        assert.strictEqual('gitterHQ', uri);
        return Promise.resolve(true);
      };

      var githubMembers = proxyquireNoCallThru('../lib/github-members', {
        './github-org-service': FakeOrgService,
        './github-me-service': FakeMeService
      });

      it('gets the members of an org', function(done) {
        githubMembers
          .getMembers('gitterHQ', 'ORG', { githubToken: 'i am a token' })
          .then(function(members) {
            assert.deepEqual(members, ['alice', 'bob']);
          })
          .nodeify(done);
      });

      it('checks if a username is a member of an org', function(done) {
        githubMembers
          .isMember('alice', 'gitterHQ', 'ORG', { username: 'alice', githubToken: 'i am a token' })
          .then(function(isMember) {
            assert(isMember);
          })
          .nodeify(done);
      });

      it('checks if a username is a member of an org', function(done) {
        githubMembers
          .isMember('alice', 'gitterHQ', 'ORG', { username: 'mary', githubToken: 'i am a token' })
          .then(function(isMember) {
            assert(isMember);
          })
          .nodeify(done);
      });
    });
  });

  describe('real #slow', function() {
    fixtureLoader.ensureIntegrationEnvironment(
      'GITTER_INTEGRATION_USERNAME',
      'GITTER_INTEGRATION_REPO_SCOPE_TOKEN',
      'GITTER_INTEGRATION_REPO',
      'GITTER_INTEGRATION_ORG'
    );

    var FAKE_USER = {
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      githubToken: fixtureLoader.GITTER_INTEGRATION_REPO_SCOPE_TOKEN
    };

    var githubMembers = require('..').GitHubMembers;

    describe('getMembers', function() {
      it('should get members of an ORG', function(done) {
        githubMembers
          .getMembers('gitterHQ', 'ORG', FAKE_USER)
          .then(function(members) {
            assert(members.length > 0);
            members.forEach(assert);
          })
          .nodeify(done);
      });

      it('should get members of an REPO', function(done) {
        githubMembers
          .getMembers(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 'REPO', FAKE_USER)
          .then(function(members) {
            assert(members.length > 0);
            members.forEach(assert);
          })
          .nodeify(done);
      });
    });

    describe('isMember', function() {
      it('should get member of an ORG', function(done) {
        githubMembers
          .isMember('suprememoocow', 'gitterHQ', 'ORG', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          })
          .nodeify(done);
      });

      it('should get member of an ORG negative', function(done) {
        githubMembers
          .isMember('tj', 'gitterHQ', 'ORG', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          })
          .nodeify(done);
      });

      it('should get member of an ORG current user', function(done) {
        githubMembers
          .isMember(
            fixtureLoader.GITTER_INTEGRATION_USERNAME,
            fixtureLoader.GITTER_INTEGRATION_ORG,
            'ORG',
            FAKE_USER
          )
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          })
          .nodeify(done);
      });

      it('should get member of an ORG current user negative', function(done) {
        githubMembers
          .isMember('gittertestbot', 'joyent', 'ORG', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          })
          .nodeify(done);
      });

      it('should get member of an REPO', function(done) {
        githubMembers
          .isMember('suprememoocow', fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 'REPO', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          })
          .nodeify(done);
      });

      it('should get member of an REPO current user', function(done) {
        githubMembers
          .isMember(
            fixtureLoader.GITTER_INTEGRATION_USERNAME,
            fixtureLoader.GITTER_INTEGRATION_REPO_FULL,
            'REPO',
            FAKE_USER
          )
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          })
          .nodeify(done);
      });
    });
  });
});
