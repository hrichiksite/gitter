'use strict';

process.env.DISABLE_API_LISTEN = '1';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('user-repos #slow', function() {
  let app;
  let request;
  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  describe('GitHub', () => {
    fixtureLoader.ensureIntegrationEnvironment(
      '#integrationUser1',
      '#integrationCollabUser1',
      'GITTER_INTEGRATION_REPO',
      'GITTER_INTEGRATION_REPO_WITH_COLLAB_ONLY_READ',
      '#oauthTokens'
    );

    const fixture = fixtureLoader.setup({
      deleteDocuments: {
        Group: [
          { 'sd.type': 'GH_REPO', 'sd.linkPath': fixtureLoader.GITTER_INTEGRATION_REPO_FULL },
          { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() }
        ],
        Troupe: [
          { 'sd.type': 'GH_REPO', 'sd.linkPath': fixtureLoader.GITTER_INTEGRATION_REPO_FULL },
          { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() + '/community' }
        ]
      },
      user1: '#integrationUser1',
      user2: '#integrationCollabUser1'
    });

    it('GET /v1/user/:userId/repos', function() {
      return request(app)
        .get('/v1/user/' + fixture.user1.id + '/repos')
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200)
        .then(function(result) {
          var repos = result.body;

          assert(
            repos.some(function(repo) {
              return repo.name === fixtureLoader.GITTER_INTEGRATION_REPO_FULL;
            })
          );
        });
    });

    it('GET /v1/user/:userId/repos?type=admin', function() {
      return request(app)
        .get('/v1/user/' + fixture.user2.id + '/repos?type=admin')
        .set('x-access-token', fixture.user2.accessToken)
        .expect(200)
        .then(function(result) {
          var repos = result.body;

          assert(
            repos.some(function(repo) {
              return repo.name !== fixtureLoader.GITTER_INTEGRATION_REPO_WITH_COLLAB_ONLY_READ;
            })
          );
        });
    });
  });

  describe('GitLab', () => {
    fixtureLoader.ensureIntegrationEnvironment(
      '#integrationGitlabUser1',
      'GITLAB_PUBLIC_PROJECT1_ID',
      'GITLAB_PUBLIC_PROJECT1_URI',
      'GITLAB_PRIVATE_PROJECT1_ID',
      'GITLAB_PRIVATE_PROJECT1_URI',
      '#oauthTokens'
    );

    const fixture = fixtureLoader.setup({
      userGitlab1: '#integrationGitlabUser1'
    });

    it('GET /v1/user/:userId/repos', async () => {
      const result = await request(app)
        .get(`/v1/user/${fixture.userGitlab1.id}/repos`)
        .set('x-access-token', fixture.userGitlab1.accessToken)
        .expect(200);
      const repos = result.body;

      const integrationRepo = repos.find(repo => {
        return repo.id === parseInt(fixtureLoader.GITLAB_PUBLIC_PROJECT1_ID, 10);
      });

      // eslint-disable-next-line no-unused-vars
      const { name, avatar_url, description, private: isPrivate, ...compareRepo } = integrationRepo;

      assert.deepStrictEqual(compareRepo, {
        type: 'GL_PROJECT',
        id: parseInt(fixtureLoader.GITLAB_PUBLIC_PROJECT1_ID, 10),
        uri: fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI,
        absoluteUri: `https://gitlab.com/${fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI}`
      });
    });

    it('GET /v1/user/:userId/repos?type=admin', async () => {
      const result = await request(app)
        .get(`/v1/user/${fixture.userGitlab1.id}/repos?type=admin`)
        .set('x-access-token', fixture.userGitlab1.accessToken)
        .expect(200);
      const repos = result.body;

      const integrationRepo = repos.find(repo => {
        return repo.id === parseInt(fixtureLoader.GITLAB_PRIVATE_PROJECT1_ID, 10);
      });

      // eslint-disable-next-line no-unused-vars
      const { name, avatar_url, description, private: isPrivate, ...compareRepo } = integrationRepo;

      assert.deepStrictEqual(compareRepo, {
        type: 'GL_PROJECT',
        id: parseInt(fixtureLoader.GITLAB_PRIVATE_PROJECT1_ID, 10),
        uri: fixtureLoader.GITLAB_PRIVATE_PROJECT1_URI,
        absoluteUri: `https://gitlab.com/${fixtureLoader.GITLAB_PRIVATE_PROJECT1_URI}`
      });
    });
  });
});
