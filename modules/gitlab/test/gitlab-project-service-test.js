'use strict';

const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

// https://docs.gitlab.com/ee/api/access_requests.html
const GUEST_ACCESS_LEVEL = 10;
const OWNER_ACCESS_LEVEL = 50;

describe('gitlab-project-service #flakey #slow #gitlab', function() {
  // These tests timeout at 10000 sometimes otherwise
  this.timeout(30000);

  fixtureLoader.ensureIntegrationEnvironment('GITLAB_USER_TOKEN', 'GITLAB_PUBLIC_PROJECT1_URI');

  const FAKE_USER = {
    username: 'FAKE_USER'
  };

  let oauthToken = null;
  let GitLabProjectService;

  beforeEach(() => {
    GitLabProjectService = proxyquireNoCallThru('../lib/project-service', {
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

    describe('getProjects', () => {
      it('should fetch projects', async () => {
        const glProjectService = new GitLabProjectService(FAKE_USER);
        const projects = await glProjectService.getProjects({
          min_access_level: GUEST_ACCESS_LEVEL
        });
        assert(projects.length > 0);
        projects.forEach(project => {
          assert.strictEqual(
            project.backend,
            'gitlab',
            'project has not gone through the standardized'
          );
        });
      });

      it('should fetch projects with parameters', async () => {
        const glProjectService = new GitLabProjectService(FAKE_USER);
        const allProjects = await glProjectService.getProjects({
          min_access_level: GUEST_ACCESS_LEVEL
        });
        const ownerProjects = await glProjectService.getProjects({
          min_access_level: OWNER_ACCESS_LEVEL
        });

        // We expect the GitLab integration user to be part of many projects but
        // only an owner in some of those projects
        assert(
          allProjects.length > ownerProjects.length,
          `Expected allProjects(${allProjects.length}) > ownerProjects(${ownerProjects.length})`
        );
      });
    });

    it('should fetch project', async () => {
      const glProjectService = new GitLabProjectService(FAKE_USER);
      const project = await glProjectService.getProject(fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI);
      assert.equal(project.backend, 'gitlab', 'project has not gone through the standardized');
      assert.equal(project.uri, fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI);
    });

    describe('getMembership', () => {
      it('should fetch project member', async () => {
        const glProjectService = new GitLabProjectService(FAKE_USER);
        // User: https://gitlab.com/gitter-integration-tests
        const gitterIntegrationTestsUserId = '2619770';
        const membership = await glProjectService.getMembership(
          'gitter-integration-tests-group/public-project1',
          gitterIntegrationTestsUserId
        );

        assert.deepEqual(membership, {
          accessLevel: 50,
          isMember: true,
          isMaintainer: true,
          isOwner: true
        });
      });

      it('should fetch project member from inherited members', async () => {
        const glProjectService = new GitLabProjectService(FAKE_USER);
        // User: https://gitlab.com/gitter-integration-tests
        const gitterIntegrationTestsUserId = '2619770';
        const membership = await glProjectService.getMembership(
          'gitter-integration-tests-group/subgroup-inherited-members/public-project1',
          gitterIntegrationTestsUserId
        );

        assert.deepEqual(membership, {
          accessLevel: 50,
          isMember: true,
          isMaintainer: true,
          isOwner: true
        });
      });

      it('should return false for non-existant project member', async () => {
        const glProjectService = new GitLabProjectService(FAKE_USER);
        const nonExistantUserId = '999999';
        const membership = await glProjectService.getMembership(
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
        const glProjectService = new GitLabProjectService(FAKE_USER);
        // User: https://gitlab.com/gitter-integration-tests
        const gitterIntegrationTestsUserId = '2619770';
        const membership = await glProjectService.getMembership(
          'gitter-integration-tests-maintainer-group/maintainer-project1',
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
