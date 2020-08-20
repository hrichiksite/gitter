'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var uriResolver = require('../lib/uri-resolver');

describe('uri-resolver', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    group1: {},
    troupe1: { group: 'group1', security: 'PUBLIC' }
  });

  describe('uriResolver', () => {
    it('should resolve user', () => {
      return uriResolver(fixture.user1.get('id'), fixture.user1.get('username')).then(function(
        result
      ) {
        assert.strictEqual(result.user.username, fixture.user1.get('username'));
      });
    });

    it('should resolve room', () => {
      return uriResolver(fixture.user1.get('id'), fixture.troupe1.get('uri')).then(function(
        result
      ) {
        assert.strictEqual(result.room.uri, fixture.troupe1.get('uri'));
      });
    });

    it('should resolve group', () => {
      return uriResolver(fixture.user1.get('id'), fixture.group1.get('uri')).then(function(result) {
        assert.strictEqual(result.group.uri, fixture.group1.get('uri'));
      });
    });
  });
});
