'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var sampleChatsService = testRequire('./services/sample-chats-service');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('sample-chats-service', function() {
  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    it('should return sample chats #slow', function(done) {
      sampleChatsService
        .getSamples()
        .then(function(chats) {
          assert(Array.isArray(chats));
        })
        .nodeify(done);
    });
  });
});
