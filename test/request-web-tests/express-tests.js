'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const fixtureUtils = require('gitter-web-test-utils/lib/fixture-utils');

const request = require('supertest');

const app = require('../../server/web');

describe('login', () => {
  describe('express.js', () => {
    const fixtures = fixtureLoader.setupEach({
      user1: {
        accessToken: 'web-internal'
      },
      troupeWithApiName1: {
        uri: 'apiapi/' + fixtureUtils.generateUri(),
        users: ['user1'],
        securityDescriptor: {
          members: 'INVITE',
          admins: 'MANUAL',
          public: false
        }
      }
    });

    // tests  regression for https://gitlab.com/gitlab-org/gitter/webapp/issues/2444
    // can be removed if we no longer use skipForApi() in express.js
    it('does not trigger skipForApi wrapper on room uri beginning with api*', async () => {
      //  one of such skipped middlewares is authenticateBearer that is processing the authorisation header
      // that means it should run on web (e.g. troupe uri) but not on API
      await request(app)
        .get('/' + fixtures.troupeWithApiName1.uri)
        .set('authorization', `Bearer ${fixtures.user1.accessToken}`)
        // If the `skipForApi` for `authenticate-bearer` was triggered, we would get a 403 here
        // This is a room so we should be able to use the `authorization` header
        .expect(200);
    });
  });
});
