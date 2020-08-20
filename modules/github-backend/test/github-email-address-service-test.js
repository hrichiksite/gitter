'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('email-address-service #github', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN',
    'GITTER_INTEGRATION_EMAIL'
  );

  describe('integration #slow', function() {
    it('should return the validated email address if the user has a token', function() {
      var service = require('../lib/github-email-address-service');

      return service({
        username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
      }).then(function(email) {
        assert.strictEqual(email, fixtureLoader.GITTER_INTEGRATION_EMAIL);
      });
    });

    it('should return nothing if the user does not have a token and does not have a public address', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'gitterawesome' }).then(function(email) {
        assert(!email);
      });
    });

    it('should return a public email address from profile with attemptDiscovery', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'gittertestbot' }, { attemptDiscovery: true }).then(function(
        email
      ) {
        assert.strictEqual(email, 'gittertestbot@datatribe.net');
      });
    });

    it('should return a public email address from commits with attemptDiscovery', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'gittertestbot' }, { attemptDiscovery: true }).then(function(
        email
      ) {
        assert.strictEqual(email, 'gittertestbot@datatribe.net');
      });
    });

    it('should return nothing if nothing is available', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'mbtesting3' }, { attemptDiscovery: true }).then(function(email) {
        assert(!email);
      });
    });
  });
});
