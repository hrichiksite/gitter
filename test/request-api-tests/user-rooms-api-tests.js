'use strict';

process.env.DISABLE_API_LISTEN = '1';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('user-rooms-api', function() {
  var app, request;

  before(function() {
    request = require('supertest');
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    user1: { accessToken: 'web-internal' },
    user2: { accessToken: 'web-internal' },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1']
    },
    troupe2: {
      security: 'PRIVATE',
      users: ['user1']
    }
  });

  it('GET /v1/user/:userId/rooms', function() {
    return request(app)
      .get(`/v1/user/${fixture.user1.id}/rooms`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var rooms = result.body;

        assert(
          rooms.some(function(r) {
            return r.id === fixture.troupe1.id;
          })
        );

        assert(
          rooms.some(function(r) {
            return r.id === fixture.troupe2.id;
          })
        );

        assert.strictEqual(rooms.length, 2);
      });
  });

  it('GET /v1/user/:userId/rooms/:roomId/unreadItems', function() {
    return request(app)
      .get(`/v1/user/${fixture.user1.id}/rooms/${fixture.troupe1.id}/unreadItems`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var { chat, mention } = result.body;

        assert.strictEqual(chat.length, 0);
        assert.strictEqual(mention.length, 0);
      });
  });

  it('PATCH /v1/user/:userId/rooms/:roomId', () => {
    return request(app)
      .put(`/v1/user/${fixture.user1.id}/rooms/${fixture.troupe2.id}`)
      .set('x-access-token', fixture.user1.accessToken)
      .send({ favourite: 1 })
      .expect(200);
  });

  it('PATCH /v1/user/:userId/rooms/:roomId is forbidden for unauthorized user', () => {
    return request(app)
      .patch(`/v1/user/${fixture.user2.id}/rooms/${fixture.troupe2.id}`)
      .set('x-access-token', fixture.user2.accessToken)
      .expect(403);
  });
});
