'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var request = require('supertest');

var app = require('../../server/web');

describe('OAuth tests', function() {
  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    oAuthClientNoRedirectUri1: {
      registeredRedirectUri: null
    },
    oAuthClient1: {
      registeredRedirectUri: 'http://localhost:3434/callback'
    },
    oAuthCode1: {
      user: 'user1',
      client: 'oAuthClient1'
    },
    oAuthClientGoodProtocol1: {
      registeredRedirectUri: 'https://gitter.im/login/desktop/callback'
    },
    oAuthClientGoodProtocol2: {
      registeredRedirectUri: 'app://gitter/oauth.html'
    },

    oAuthClientNoProtocol1: {
      registeredRedirectUri: 'noprotocol'
    },
    oAuthClientBadDataProtocol1: {
      registeredRedirectUri: 'data:text/html,<script>alert(1)</script>;;?sss'
    },
    oAuthClientBadDataProtocol2: {
      registeredRedirectUri: '%0Adata:text/html,<script>alert(1)</script>;;?sss'
    },
    oAuthClientBadJavascriptProtocol1: {
      registeredRedirectUri: `javascript:alert('xss')`
    },
    oAuthClientBadJavascriptProtocol2: {
      registeredRedirectUri: `\njavascript:alert('xss')`
    },
    oAuthClientBadJavascriptProtocol3: {
      registeredRedirectUri: `%0Ajavascript:alert('xss')`
    },
    oAuthClientBadXss1: {
      registeredRedirectUri: `"onmouseover="alert(1) "`
    },
    oAuthClientBadXss2: {
      registeredRedirectUri: `&quot;&gt;&lt;img src=x onerror=confirm(1);&gt;`
    }
  });

  it("GET /login/oauth/token clears out authorization code so it can't be re-used", async function() {
    this.timeout(8000);

    const postData = {
      client_id: fixture.oAuthClient1.clientKey,
      client_secret: fixture.oAuthClient1.clientSecret,
      redirect_uri: fixture.oAuthClient1.registeredRedirectUri,
      grant_type: 'authorization_code',
      code: fixture.oAuthCode1.code
    };

    await request(app)
      .post(`/login/oauth/token`)
      .send(postData)
      .expect(200)
      .then(function(result) {
        assert(
          result.body.access_token && result.body.access_token.length > 0,
          'no access token provided in body'
        );
        assert(result.body.token_type === 'Bearer', 'wrong token_type returned');
      });

    await request(app)
      .post(`/login/oauth/token`)
      .send(postData)
      .expect(403)
      .then(function(result) {
        assert.deepEqual(result.body, {
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        });
      });
  });

  const goodFixtureKeys = ['oAuthClientGoodProtocol1', 'oAuthClientGoodProtocol2'];

  goodFixtureKeys.forEach(goodFixtureKey => {
    it(`GET /login/oauth/authorize with bad protocol(${goodFixtureKey}) shows approval authorization page`, async () => {
      this.timeout(8000);

      const goodOauthClient = fixture[goodFixtureKey];

      const goodRedirectUri = encodeURIComponent(goodOauthClient.registeredRedirectUri);

      await request(app)
        .get(
          `/login/oauth/authorize?response_type=code&redirect_uri=${goodRedirectUri}&client_id=${goodOauthClient.clientKey}`
        )
        .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
        .expect(200)
        .then(function(result) {
          assert(result.text.includes('Do you approve?'), 'has approval question text');
        });
    });
  });

  const badFixtureKeys = [
    'oAuthClientNoProtocol1',
    'oAuthClientBadDataProtocol1',
    'oAuthClientBadDataProtocol2',
    'oAuthClientBadJavascriptProtocol1',
    'oAuthClientBadJavascriptProtocol2',
    'oAuthClientBadJavascriptProtocol3',
    'oAuthClientBadXss1',
    'oAuthClientBadXss2'
  ];

  badFixtureKeys.forEach(badFixtureKey => {
    it(`GET /login/oauth/authorize with bad protocol(${badFixtureKey}) shows invalid error page`, async () => {
      this.timeout(8000);

      const badOauthClient = fixture[badFixtureKey];

      const badRedirectUri = encodeURIComponent(badOauthClient.registeredRedirectUri);

      await request(app)
        .get(
          `/login/oauth/authorize?response_type=code&redirect_uri=${badRedirectUri}&client_id=${badOauthClient.clientKey}`
        )
        .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
        .expect(401)
        .then(function(result) {
          assert(
            result.text.includes('Your OAuth request is incorrect'),
            'has incorrect OAuth request page'
          );
          assert(
            result.text.includes('Provided redirectUri is using disallowed bad protocol'),
            'tells you what is wrong with the redirect URI'
          );
        });
    });
  });

  it(`GET /login/oauth/authorize with no client.redirect_uri does not crash server`, async () => {
    this.timeout(8000);

    const oAuthClient = fixture.oAuthClientNoRedirectUri1;

    await request(app)
      .get(
        `/login/oauth/authorize?response_type=code&redirect_uri=http://whatever&client_id=${oAuthClient.clientKey}`
      )
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(401);
  });

  it(`GET /login/oauth/authorize with no ?redirect_uri query param does not crash server`, async () => {
    this.timeout(8000);

    const oAuthClient = fixture.oAuthClientNoRedirectUri1;

    await request(app)
      .get(`/login/oauth/authorize?response_type=code&client_id=${oAuthClient.clientKey}`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(401);
  });

  it(`GET /login/oauth/authorize with empty ?redirect_uri= query param does not crash server`, async () => {
    this.timeout(8000);

    const oAuthClient = fixture.oAuthClientNoRedirectUri1;

    await request(app)
      .get(
        `/login/oauth/authorize?response_type=code&redirect_uri=&client_id=${oAuthClient.clientKey}`
      )
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(401);
  });
});
