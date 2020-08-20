'use strict';

process.env.DISABLE_API_LISTEN = '1';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('oauth-client-api', function() {
  let app, request;

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  const fixture = fixtureLoader.setupEach({
    user1: {
      accessToken: 'web-internal'
    },
    user2: {
      accessToken: 'web-internal'
    },
    userNoOAuthClients: {
      accessToken: 'web-internal'
    },
    oAuthClient1: {
      ownerUser: 'user1'
    },
    oAuthClient2: {
      ownerUser: 'user2'
    },
    oAuthClientToDelete1: {
      ownerUser: 'user1'
    },
    oAuthClientToDelete2: {
      ownerUser: 'user2'
    }
  });

  it('GET /v1/oauth-clients with no OAuth clients returns empty list', function() {
    return request(app)
      .get('/v1/oauth-clients')
      .set('x-access-token', fixture.userNoOAuthClients.accessToken)
      .expect(200)
      .then(function(result) {
        const body = result.body;

        assert.deepEqual(body, []);
      });
  });

  it('GET /v1/oauth-clients returns list of OAuth clients the user owns', async function() {
    const result = await request(app)
      .get('/v1/oauth-clients')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);
    const clients = result.body;

    assert.strictEqual(clients.length, 2);

    assert(clients.some(client => mongoUtils.objectIDsEqual(client.id, fixture.oAuthClient1._id)));
    assert(
      clients.some(client => mongoUtils.objectIDsEqual(client.id, fixture.oAuthClientToDelete1._id))
    );
  });

  it('POST /v1/oauth-clients creates new OAuth client', function() {
    const NAME = 'my-new-oauth-app';
    const REGISTERED_REDIRECT_URI = 'http://nice-new-app.gitter.im/login/callback';

    return request(app)
      .post('/v1/oauth-clients')
      .send({
        name: NAME,
        registeredRedirectUri: REGISTERED_REDIRECT_URI
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        const { name, registeredRedirectUri, ownerUserId } = result.body;

        assert.strictEqual(name, NAME);
        assert.strictEqual(registeredRedirectUri, REGISTERED_REDIRECT_URI);
        assert(mongoUtils.objectIDsEqual(ownerUserId, fixture.user1._id));
      });
  });

  describe('DELETE /v1/oauth-clients/:oauthClientId', () => {
    it('can delete OAuth app', function() {
      return request(app)
        .delete(`/v1/oauth-clients/${fixture.oAuthClientToDelete1._id}`)
        .set('x-access-token', fixture.user1.accessToken)
        .expect(200);
    });

    it('unable to delete an app that you do not own', function() {
      return request(app)
        .delete(`/v1/oauth-clients/${fixture.oAuthClientToDelete2._id}`)
        .set('x-access-token', fixture.user1.accessToken)
        .expect(403);
    });
  });
});
