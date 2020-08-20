'use strict';

const testRequire = require('../../test-require');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assertUtils = require('../../assert-utils');
const serialize = require('gitter-web-serialization/lib/serialize');
const OauthClientStrategy = testRequire('./serializers/rest/oauth-client-strategy');

describe('oauth-client-strategy-test', function() {
  const fixture = fixtureLoader.setupEach({
    user1: {
      accessToken: 'web-internal'
    },
    oAuthClient1: {
      ownerUser: 'user1'
    }
  });

  let expectedOAuthClient1;
  beforeEach(() => {
    expectedOAuthClient1 = [
      {
        id: fixture.oAuthClient1.id,
        name: fixture.oAuthClient1.name,
        tag: fixture.oAuthClient1.tag,
        clientKey: fixture.oAuthClient1.clientKey,
        clientSecret: fixture.oAuthClient1.clientSecret,
        registeredRedirectUri: fixture.oAuthClient1.registeredRedirectUri,
        ownerUserId: fixture.user1.id,
        revoked: false
      }
    ];
  });

  it('should serialize a OAuth client', function() {
    var strategy = new OauthClientStrategy({});
    return serialize([fixture.oAuthClient1], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, expectedOAuthClient1);
    });
  });
});
