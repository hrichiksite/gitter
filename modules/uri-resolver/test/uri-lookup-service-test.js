'use strict';

var assert = require('assert');

var uriLookupService = require('../lib/uri-lookup-service');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('uri-lookup-service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    troupe1: {},
    group1: {},
    troupe2: {}, // used in test 3, for missing lookup
    user2: { username: true }, // used in test 3, for missing lookup
    user3: { username: true }
  });

  fixtureLoader.disableMongoTableScans();

  it('should lookup usernames', function() {
    var uri = fixture.user2.username;

    return uriLookupService
      .lookupUri(uri)
      .then(function(uriLookup) {
        assert(uriLookup);
        assert(!uriLookup.troupeId);
        assert(!uriLookup.groupId);

        assert.equal(uriLookup.userId, fixture.user2.id);

        return uriLookupService.lookupUri(uri);
      })
      .then(function(uriLookup) {
        assert(uriLookup);
        assert(!uriLookup.troupeId);
        assert(!uriLookup.groupId);

        assert.equal(uriLookup.userId, fixture.user2.id);
      });
  });

  it('should lookup rooms', function() {
    var uri = fixture.troupe1.uri;

    return uriLookupService
      .lookupUri(uri)
      .then(function(uriLookup) {
        assert(uriLookup);
        assert(!uriLookup.userId);
        assert(!uriLookup.groupId);
        assert.equal(uriLookup.troupeId, fixture.troupe1.id);

        return uriLookupService.lookupUri(uri);
      })
      .then(function(uriLookup) {
        assert(uriLookup);
        assert(!uriLookup.userId);
        assert(!uriLookup.groupId);
        assert.equal(uriLookup.troupeId, fixture.troupe1.id);
      });
  });

  it('should lookup groups', function() {
    var uri = fixture.group1.homeUri;

    return uriLookupService
      .lookupUri(uri)
      .then(function(uriLookup) {
        assert(uriLookup);
        assert(!uriLookup.userId);
        assert(!uriLookup.troupeId);
        assert.equal(uriLookup.groupId, fixture.group1.id);

        return uriLookupService.lookupUri(uri);
      })
      .then(function(uriLookup) {
        assert(uriLookup);
        assert(!uriLookup.userId);
        assert(!uriLookup.troupeId);

        assert.equal(uriLookup.groupId, fixture.group1.id);
      });
  });

  it('should not fail looking up rooms', function() {
    return uriLookupService.lookupUri('gitterHQ/cloaked-avenger');
  });
});
