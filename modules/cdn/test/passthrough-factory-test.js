'use strict';

var passthroughFactory = require('../shared/passthrough-factory');
var assert = require('assert');

function makeFixtures(FIXTURES, cdn) {
  FIXTURES.forEach(function(meta) {
    Object.keys(meta.mappings).forEach(function(uri) {
      var expected = meta.mappings[uri];

      it(meta.name + ': ' + uri, function() {
        var actual = cdn(uri, {
          email: meta.email,
          nonrelative: meta.nonrelative,
          notStatic: meta.notStatic
        });
        assert.strictEqual(actual, expected);
      });
    });
  });
}

describe('passthrough-factory', function() {
  describe('client-side', function() {
    var cdn = passthroughFactory({});

    var FIXTURES = [
      {
        name: 'should handle defaults',
        mappings: {
          xyz123: '/_s/l/xyz123',
          abc123: '/_s/l/abc123'
        }
      },
      {
        name: 'should handle nonrelative',
        nonrelative: true,
        mappings: {
          xyz123: '/_s/l/xyz123',
          abc123: '/_s/l/abc123'
        }
      },
      {
        name: 'should handle notStatic',
        notStatic: true,
        mappings: {
          xyz123: '/xyz123',
          abc123: '/abc123'
        }
      }
    ];

    makeFixtures(FIXTURES, cdn);
  });

  describe('server-side', function() {
    var cdn = passthroughFactory({
      emailBasePath: 'https://gitter.test',
      webBasepath: 'https://gitter2.test'
    });

    var FIXTURES = [
      {
        name: 'should handle defaults',
        mappings: {
          xyz123: '/_s/l/xyz123',
          abc123: '/_s/l/abc123'
        }
      },
      {
        name: 'should handle emails',
        email: true,
        mappings: {
          xyz123: 'https://gitter.test/_s/l/xyz123',
          abc123: 'https://gitter.test/_s/l/abc123'
        }
      },
      {
        name: 'should handle nonrelative',
        nonrelative: true,
        mappings: {
          xyz123: 'https://gitter2.test/_s/l/xyz123',
          abc123: 'https://gitter2.test/_s/l/abc123'
        }
      },
      {
        name: 'should handle notStatic',
        notStatic: true,
        mappings: {
          xyz123: '/xyz123',
          abc123: '/abc123'
        }
      }
    ];

    makeFixtures(FIXTURES, cdn);
  });
});
