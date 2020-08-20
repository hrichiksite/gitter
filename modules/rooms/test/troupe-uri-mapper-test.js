/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var troupeUriMapper = require('../lib/troupe-uri-mapper');

describe('troupe-uri-mapper', function() {
  describe('#findInitialRoomUrlForUser', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      userNoTroupes: {},
      troupe1: { users: ['user1'] },
      troupeOneToOne: { oneToOne: true, users: ['user1', 'user2'] }
    });

    it('#01 should return null when a user has no troupes', function() {
      return troupeUriMapper
        .getUrlOfFirstAccessibleRoom([fixture.userNoTroupes.id], fixture.user1.id)
        .then(function(url) {
          assert(!url);
        });
    });

    it('#02 should return the first room that allows access', function() {
      return troupeUriMapper
        .getUrlOfFirstAccessibleRoom(
          [fixture.userNoTroupes.id, fixture.troupe1.id],
          fixture.user1.id
        )
        .then(function(url) {
          assert.strictEqual(url, '/' + fixture.troupe1.uri);
        });
    });

    it('#03 should return the one to one rooms', function() {
      return troupeUriMapper
        .getUrlOfFirstAccessibleRoom(
          [fixture.userNoTroupes.id, fixture.troupeOneToOne.id, fixture.troupe1.id],
          fixture.user1.id
        )
        .then(function(url) {
          assert.strictEqual(url, '/' + fixture.user2.username);
        });
    });

    it('#04 should return the other user in a one-to-one room', function() {
      return troupeUriMapper
        .getUrlOfFirstAccessibleRoom(
          [fixture.userNoTroupes.id, fixture.troupeOneToOne.id],
          fixture.user2.id
        )
        .then(function(url) {
          assert.strictEqual(url, '/' + fixture.user1.username);
        });
    });
  });
});
