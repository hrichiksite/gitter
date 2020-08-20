'use strict';

const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

// https://docs.gitlab.com/ee/api/access_requests.html
const OWNER_ACCESS_LEVEL = 50;

describe('gitlab-group-service #flakey #slow #gitlab', function() {
  // These tests timeout at 10000 sometimes otherwise
  this.timeout(30000);

  fixtureLoader.ensureIntegrationEnvironment('GITLAB_USER_TOKEN', 'GITLAB_GROUP1_URI');

  const FAKE_USER = {
    username: 'FAKE_USER'
  };

  let oauthToken = null;
  let GitLabGroupService;

  beforeEach(() => {
    GitLabGroupService = proxyquireNoCallThru('../lib/group-service', {
      './get-gitlab-access-token-from-user': function() {
        return Promise.resolve(oauthToken);
      }
    });
  });

  afterEach(() => {
    oauthToken = null;
  });

  describe('as a GitLab user', () => {
    beforeEach(() => {
      oauthToken = fixtureLoader.GITLAB_USER_TOKEN;
    });

    describe('getGroups', () => {
      it('should fetch groups', async () => {
        const glGroupService = new GitLabGroupService(FAKE_USER);
        const groups = await glGroupService.getGroups();
        assert(groups.length > 0);
        groups.forEach(group => {
          assert.strictEqual(
            group.backend,
            'gitlab',
            'group has not gone through the standardized'
          );
        });
      });

      it('should fetch groups with parameters', async () => {
        const glService = new GitLabGroupService(FAKE_USER);
        const allGroups = await glService.getGroups();
        const ownerGroups = await glService.getGroups({ min_access_level: OWNER_ACCESS_LEVEL });

        // We expect the GitLab integration user to be part of many groups but
        // only an owner in some of those groups
        assert(
          allGroups.length > ownerGroups.length,
          `Expected allGroups(${allGroups.length}) > ownerGroups(${ownerGroups.length})`
        );
      });
    });

    it('should fetch group', async () => {
      const glGroupService = new GitLabGroupService(FAKE_USER);
      const group = await glGroupService.getGroup(fixtureLoader.GITLAB_GROUP1_URI);
      assert.equal(group.backend, 'gitlab', 'group has not gone through the standardized');
      assert.equal(group.uri, fixtureLoader.GITLAB_GROUP1_URI);
    });

    describe('getMembership', () => {
      it('should fetch group member', async () => {
        const glGroupService = new GitLabGroupService(FAKE_USER);
        // User: https://gitlab.com/gitter-integration-tests
        const gitterIntegrationTestsUserId = '2619770';
        const membership = await glGroupService.getMembership(
          'gitter-integration-tests-group',
          gitterIntegrationTestsUserId
        );

        assert.deepEqual(membership, {
          accessLevel: 50,
          isMember: true,
          isMaintainer: true,
          isOwner: true
        });
      });

      it('should fetch group member from inherited members', async () => {
        const glGroupService = new GitLabGroupService(FAKE_USER);
        // User: https://gitlab.com/gitter-integration-tests
        const gitterIntegrationTestsUserId = '2619770';
        const membership = await glGroupService.getMembership(
          'gitter-integration-tests-group/subgroup-inherited-members',
          gitterIntegrationTestsUserId
        );

        assert.deepEqual(membership, {
          accessLevel: 50,
          isMember: true,
          isMaintainer: true,
          isOwner: true
        });
      });

      it('should return false for non-existant group member', async () => {
        const glGroupService = new GitLabGroupService(FAKE_USER);
        const nonExistantUserId = '999999';
        const membership = await glGroupService.getMembership(
          'gitter-integration-tests-group',
          nonExistantUserId
        );

        assert.deepEqual(membership, {
          accessLevel: 0,
          isMember: false,
          isMaintainer: false,
          isOwner: false
        });
      });

      it('should not be isOwner when only maintainer', async () => {
        const glGroupService = new GitLabGroupService(FAKE_USER);
        // User: https://gitlab.com/gitter-integration-tests
        const gitterIntegrationTestsUserId = '2619770';
        const membership = await glGroupService.getMembership(
          'gitter-integration-tests-maintainer-group',
          gitterIntegrationTestsUserId
        );

        assert.deepEqual(membership, {
          accessLevel: 40,
          isMember: true,
          isMaintainer: true,
          isOwner: false
        });
      });
    });
  });
});
