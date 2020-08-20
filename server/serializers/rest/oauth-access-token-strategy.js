'use strict';

const obfuscateToken = require('gitter-web-github').obfuscateToken;

class OauthAccessTokenStrategy {
  preload() {}

  map(accessToken) {
    var id = accessToken.id || (accessToken._id && accessToken._id.toHexString());

    return {
      id,
      token: obfuscateToken(accessToken.token),
      userId: accessToken.userId,
      clientId: accessToken.clientId,
      expires: accessToken.expires
    };
  }
}

module.exports = OauthAccessTokenStrategy;
