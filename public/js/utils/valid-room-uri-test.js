'use strict';

var isValidRoomUri = require('./valid-room-uri');
var RESERVED = require('gitter-web-validators/lib/reserved-namespaces').list;
var RESERVED_SUB = require('gitter-web-validators/lib/reserved-sub-namespaces').list;
var assert = require('assert');

function test(name, expected) {
  expected = typeof expected === 'undefined' ? true : expected;
  var result = isValidRoomUri(name);
  // keeping this as it is useful for seeing which one actually broke
  //if (result !== expected) {
  //  console.log(name);
  //}
  assert.equal(result, expected);
}

describe('valid-room-uri', function() {
  it('rejects vanity keywords', function() {
    RESERVED.forEach(function(keyword) {
      test('/' + keyword, false);
    });
    RESERVED_SUB.forEach(function(keyword) {
      test('/foo/' + keyword, false);
    });
  });

  it("accepts rooms with vanity keywords, but aren't vanity keyworkds", function() {
    test('/aboutandrew');
    test('/apiguy');
    test('/aboutandrew?test=true');
    test('/apiguy?test=true');
    test('/aboutandrew/roomname');
    test('/aboutandrew/topicsname');
  });

  it('rejects undefined and empty string', function() {
    test('     ', false);
    test(null, false);
    test(undefined, false);
    test('', false);
    test('a', false);
  });

  it('rejects archive links', function() {
    test('/gitterHQ/gitter/archives/all', false);
    test('/gitterHQ/gitter/archives/2014/12/11', false);
    test('/gitterHQ/gitter/archives/all?test=true', false);
    test('/gitterHQ/gitter/archives/2014/12/11?test=true', false);
  });

  it('accepts room URIs', function() {
    test('/i-love-cats');
    test('/i-love-cats/Lobby');
    test('/i-love-cats/community');
    test('/gitterHQ');
    test('/gitterHQ/gitter');
    test('/gitterHQ/gitter/channel');
    test('/gitterHQ?test=true');
    test('/gitterHQ/gitter?test=true');
    test('/gitterHQ/gitter/channel?test=true');
  });

  /**
   * https://github.com/troupe/gitter-webapp/issues/683
   */
  it('should detect orgs with dashes in their names', function() {
    test('/orgs/dev-ua/rooms', false);
  });

  /**
   * https://github.com/troupe/gitter-webapp/issues/683
   */
  it('should detect orgs community with underscores in their names', function() {
    test('/orgs/dev_ua/rooms', false);
  });

  /**
  /**
   * https://github.com/troupe/gitter-webapp/issues/683
   */
  it('should anything under /orgs/', function() {
    test('/orgs/blah/blah/blah', false);
  });

  /**
   *
   */
  it.skip('should ensure that org names do not have underscores in them', function() {
    test('/gitter_hq', false);
  });
});
