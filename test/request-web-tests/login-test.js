'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const request = require('supertest');
const assert = require('assert');
const { CookieAccessInfo } = require('cookiejar');

const app = require('../../server/web');

describe('login', () => {
  describe('passport-login.js', () => {
    const fixtures = fixtureLoader.setupEach({
      user1: {
        accessToken: 'web-internal'
      },
      troupe1: {
        users: ['user1'],
        securityDescriptor: {
          members: 'INVITE',
          admins: 'MANUAL',
          public: false
        }
      }
    });

    it('should reset the session cookie during successful login', async () => {
      const agent = request.agent(app);

      // get anonymous session
      await agent.get('/').expect(200);
      const anonymousSessionCookie = agent.jar.getCookie('d_session', CookieAccessInfo());
      // this assertion just validates that the agent.jar.getCookie() returns truthy value (in case the agent implementation changes)
      assert(anonymousSessionCookie.value);

      // login
      await agent
        .get('/' + fixtures.troupe1.uri)
        .set('authorization', `Bearer ${fixtures.user1.accessToken}`)
        .expect(200);
      const loggedInSessionCookie = agent.jar.getCookie('d_session', CookieAccessInfo());
      assert(loggedInSessionCookie.value);

      assert.notEqual(loggedInSessionCookie.value, anonymousSessionCookie.value);
    });

    it('session cookie is the same on subsequent requests', async () => {
      const agent = request.agent(app);

      // login
      await agent
        .get('/' + fixtures.troupe1.uri)
        .set('authorization', `Bearer ${fixtures.user1.accessToken}`)
        .expect(200);
      const loggedInSessionCookie = agent.jar.getCookie('d_session', CookieAccessInfo());
      // this assertion just validates that the agent.jar.getCookie() returns truthy value (in case the agent implementation changes)
      assert(loggedInSessionCookie.value);

      // Check to make sure the session cookie is the same on subsequent requests
      await agent
        .get('/' + fixtures.troupe1.uri)
        .set('authorization', `Bearer ${fixtures.user1.accessToken}`)
        .expect(200);
      const secondRequestSessionCookie = agent.jar.getCookie('d_session', CookieAccessInfo());
      assert(secondRequestSessionCookie.value);

      assert.equal(secondRequestSessionCookie.value, loggedInSessionCookie.value);
    });
  });

  describe('GitHub scope upgrade', () => {
    const fixtures = fixtureLoader.setupEach({
      userGithub1: {
        accessToken: 'web-internal'
      },

      userGitlab1: {
        accessToken: 'web-internal',
        githubId: undefined,
        githubToken: undefined
      },
      identityGitlab1: {
        user: 'userGitlab1',
        provider: 'gitlab',
        providerKey: fixtureLoader.generateGithubId()
      }
    });

    it(`should allow GitHub user to upgrade their GitHub OAuth scope`, async () => {
      const agent = request.agent(app);

      await agent
        .post('/login/upgrade?scopes=repo')
        .set('authorization', `Bearer ${fixtures.userGithub1.accessToken}`)
        .expect(302);
    });

    // Once we allow multiple identities for a single user, we should get rid of this #multiple-identity-user
    it(`shouldn't allow GitLab user to upgrade their GitHub OAuth scope`, async () => {
      const agent = request.agent(app);

      await agent
        .post('/login/upgrade?scopes=repo')
        .set('authorization', `Bearer ${fixtures.userGitlab1.accessToken}`)
        .expect(403);
    });
  });
});
