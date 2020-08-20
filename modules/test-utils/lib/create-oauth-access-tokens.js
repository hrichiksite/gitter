'use strict';

var debug = require('debug')('gitter:tests:test-fixtures');
var crypto = require('crypto');
const assert = require('assert');
const anonymousTokenProvider = require('gitter-web-oauth/lib/tokens/anonymous-token-provider');
const { OAuthAccessToken } = require('gitter-web-persistence');

const OAUTH_ACCESS_TOKEN = /^oAuthAccessToken/;

function createOAuthAccessToken({ fixtureName, token, userId, clientId }) {
  debug('Creating %s', fixtureName);
  assert(clientId);
  if (userId) {
    return OAuthAccessToken.create({
      token: token || crypto.randomBytes(20).toString('hex'),
      userId,
      clientId
    });
  } else {
    return anonymousTokenProvider.getToken(null, clientId);
  }
}

/**
 * Generates oauth access token. Requires an OAuth client to be created first
 * the `user` argument is optional. If missing, anonymous token is created.
 *
 * @example:
 * fixtureLoader.setup({
 *   oAuthClient1: {},
 *   user1: {},
 *   oAuthAccessToken1: { user: 'user1', client: 'oAuthClient1' }
 * });
 */
async function createOAuthAccessTokens(expected, fixture) {
  const expectedTokens = Object.keys(expected)
    .filter(fixtureName => fixtureName.match(OAUTH_ACCESS_TOKEN))
    .map(fixtureName => ({ fixtureName, ...expected[fixtureName] }));

  for (const expectedToken of expectedTokens) {
    const userId = expectedToken.user && fixture[expectedToken.user]._id;
    const clientId = fixture[expectedToken.client]._id;
    const { fixtureName, token } = expectedToken;
    const tokenFixture = await createOAuthAccessToken({ userId, clientId, fixtureName, token });
    fixture[fixtureName] = tokenFixture;
  }
}

module.exports = createOAuthAccessTokens;
