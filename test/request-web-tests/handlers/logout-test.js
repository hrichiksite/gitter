'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const request = require('supertest');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const app = require('../../../server/web');

describe('logout handler', () => {
  const fixture = fixtureLoader.setup({
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

  it('token is removed after logging out', async function() {
    this.timeout(16000);

    // Make sure our token works to see the private room
    await request(app)
      .get(`/${fixture.troupe1.uri}`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);

    // Logout which should destroy the accessToken
    await request(app)
      .post(`/logout`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);

    // Make sure we can't access the room with the same token
    return request(app)
      .get(`/${fixture.troupe1.uri}`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(401);
  });
});
