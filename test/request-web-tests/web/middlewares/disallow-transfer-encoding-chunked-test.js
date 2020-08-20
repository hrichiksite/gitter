'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const request = require('supertest');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

const app = require('../../../../server/web');

describe('express-error-handler', function() {
  const fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    }
  });

  it('does not allow a request with Transfer-Encoding: chunked', function() {
    return request(app)
      .get(`/api/v1/user/me`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .set('Transfer-Encoding', 'chunked')
      .expect(406);
  });

  it('does not care about case when disallowing Transfer-Encoding: chunked', function() {
    return request(app)
      .get(`/api/v1/user/me`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .set('transfer-encoding', 'chunked')
      .expect(406);
  });
});
