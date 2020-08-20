'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var testRequire = require('../test-require');
var exploreService = testRequire('./services/explore-service');

describe('explore-service #slow', function() {
  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      Troupe: [
        {
          tags: {
            $in: ['explore-test']
          },
          'sd.public': true
        }
      ]
    },
    troupe1: {
      tags: ['explore-test']
    },
    troupe2: {},
    tags: ['explore-test'],
    securityDescriptor: {
      private: true
    }
  });

  it('should only find public troupes', function() {
    fixtureLoader.disableMongoTableScans();

    return exploreService.fetchByTags(['explore-test']).then(function(rooms) {
      // it should only find the public troupe
      assert.strictEqual(rooms.length, 1);
      assert(
        rooms.some(function(room) {
          return room.id === fixture.troupe1.id;
        })
      );
    });
  });
});
