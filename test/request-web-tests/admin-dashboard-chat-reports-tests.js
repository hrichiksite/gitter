'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var request = require('supertest');

var app = require('../../server/web');

describe('Admin dashboard: chat message reports', function() {
  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    userStaff1: {
      staff: true,
      accessToken: 'web-internal'
    }
  });

  it('GET /-/admin/chat-message-reports unauthorized is forbidden', function() {
    return request(app)
      .get(`/-/admin/chat-message-reports`)
      .expect(403)
      .then(function(result) {
        assert(
          !result.text.includes('Admin dashboard: Chat message reports'),
          'response does NOT have dashboard heading'
        );
      });
  });

  it('GET /-/admin/chat-message-reports as normal user is forbidden', function() {
    return request(app)
      .get(`/-/admin/chat-message-reports`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(403)
      .then(function(result) {
        assert(
          !result.text.includes('Admin dashboard: Chat message reports'),
          'response does NOT have dashboard heading'
        );
      });
  });

  it('GET /-/admin/chat-message-reports as staff gets data', function() {
    return request(app)
      .get(`/-/admin/chat-message-reports`)
      .set('Authorization', `Bearer ${fixture.userStaff1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert(
          result.text.includes('Admin dashboard: Chat message reports'),
          'response has dashboard heading'
        );
      });
  });
});
