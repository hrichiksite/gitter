'use strict';

function OauthClientStrategy(options) {
  this.options = options || {};

  this.preload = function() {
    var strategies = [];

    return Promise.all(strategies);
  };

  this.map = function(oauthClient) {
    var id = oauthClient.id || (oauthClient._id && oauthClient._id.toHexString());

    return {
      id,
      name: oauthClient.name,
      tag: oauthClient.tag,
      clientKey: oauthClient.clientKey,
      clientSecret: oauthClient.clientSecret,
      registeredRedirectUri: oauthClient.registeredRedirectUri,
      ownerUserId: oauthClient.ownerUserId,
      revoked: oauthClient.revoked
    };
  };
}

OauthClientStrategy.prototype = {
  name: 'OauthClientStrategy'
};

module.exports = OauthClientStrategy;
