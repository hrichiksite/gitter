'use strict';

process.env.DISABLE_API_LISTEN = '1';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('user-orgs #slow', () => {
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
      'GITTER_INTEGRATION_ORG',
      'GITTER_INTEGRATION_ORG_ID',
      '#oauthTokens'
    );

    const fixture = fixtureLoader.setup({
      deleteDocuments: {
        Group: [
          { 'sd.type': 'GH_ORG', 'sd.linkPath': fixtureLoader.GITTER_INTEGRATION_ORG },
          { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() }
        ],
        Troupe: [
          { 'sd.type': 'GH_ORG', 'sd.linkPath': fixtureLoader.GITTER_INTEGRATION_ORG },
          { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() + '/community' }
        ]
      },
      user1: '#integrationUser1'
    });

    it('GET /v1/user/:userId/orgs', async () => {
      const result = await request(app)
        .get(`/v1/user/${fixture.user1.id}/orgs`)
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200);

      const orgs = result.body;

      const integrationOrg = orgs.find(org => {
        return org.id === parseInt(fixtureLoader.GITTER_INTEGRATION_ORG_ID, 10);
      });
      const { avatar_url, ...compareOrg } = integrationOrg;

      assert.deepStrictEqual(compareOrg, {
        type: 'GH_ORG',
        id: parseInt(fixtureLoader.GITTER_INTEGRATION_ORG_ID, 10),
        name: fixtureLoader.GITTER_INTEGRATION_ORG,
        uri: 'gitter-integration-tests-organisation',
        absoluteUri: `https://github.com/${fixtureLoader.GITTER_INTEGRATION_ORG}`,
        room: null,
        premium: false
      });
      assert(avatar_url);
    });
  });

  describe('GitLab', () => {
    fixtureLoader.ensureIntegrationEnvironment(
      '#integrationGitlabUser1',
      'GITLAB_GROUP1_ID',
      'GITLAB_GROUP1_URI',
      '#oauthTokens'
    );

    const fixture = fixtureLoader.setup({
      userGitlab1: '#integrationGitlabUser1'
    });

    it('GET /v1/user/:userId/orgs', async () => {
      const result = await request(app)
        .get(`/v1/user/${fixture.userGitlab1.id}/orgs`)
        .set('x-access-token', fixture.userGitlab1.accessToken)
        .expect(200);

      const orgs = result.body;

      const integrationOrg = orgs.find(org => {
        return org.id === parseInt(fixtureLoader.GITLAB_GROUP1_ID, 10);
      });
      const { avatar_url, ...compareOrg } = integrationOrg;

      assert.deepStrictEqual(compareOrg, {
        type: 'GL_GROUP',
        id: parseInt(fixtureLoader.GITLAB_GROUP1_ID, 10),
        name: fixtureLoader.GITLAB_GROUP1_URI,
        uri: 'gitter-integration-tests-group',
        absoluteUri: `https://gitlab.com/groups/${fixtureLoader.GITLAB_GROUP1_URI}`
      });
      assert(avatar_url);
    });
  });
});
