'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const request = require('supertest');

const mockedRequest = require('request');

const returnSuccess = async function(_requestData, callback) {
  callback(
    null,
    {
      statusCode: 200
    },
    []
  );
};
mockedRequest.get = returnSuccess;
mockedRequest.del = returnSuccess;

const app = proxyquireNoCallThru('../../../server/web', {
  request: mockedRequest
});

describe('Integration settings', () => {
  const fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    userAdmin1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['userAdmin1']
      },
      users: ['user1', 'userAdmin1']
    }
  });

  it('GET /settings/integrations/<community>/<room> unauthorized is not allowed', async () => {
    await request(app)
      .get(`/settings/integrations/${fixture.troupe1.uri}`)
      .expect(401);
  });

  it('GET /settings/integrations/<community>/<room> as normal user is forbidden', async () => {
    await request(app)
      .get(`/settings/integrations/${fixture.troupe1.uri}`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(403);
  });

  it('GET /settings/integrations/<community>/<room> as room admin gets data', async () => {
    await request(app)
      .get(`/settings/integrations/${fixture.troupe1.uri}`)
      .set('Authorization', `Bearer ${fixture.userAdmin1.accessToken}`)
      .expect(200);
  });

  it('DELETE /settings/integrations/<community>/<room> as normal user is forbidden', async () => {
    await request(app)
      .post(`/settings/integrations/${fixture.troupe1.uri}`)
      .send(`_method=delete&accessToken=${fixture.user1.accessToken}&id=5d25cc4b18d95bf6119570ed`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(403);
  });
});
