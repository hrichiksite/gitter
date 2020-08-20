'use strict';

var singleFactory = require('../shared/single-factory');
var assert = require('assert');

describe('single-factory', function() {
  var cdn = singleFactory({
    hosts: ['cdn01.gitter.test'],
    emailBasePath: 'https://gitter.test',
    cdnPrefix: '/_s/moo'
  });

  var FIXTURES = [
    {
      name: 'should handle defaults',
      mappings: {
        xyz123: '//cdn01.gitter.test/_s/moo/xyz123',
        abc123: '//cdn01.gitter.test/_s/moo/abc123'
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
        xyz123: 'https://cdn01.gitter.test/_s/moo/xyz123',
        abc123: 'https://cdn01.gitter.test/_s/moo/abc123'
      }
    },
    {
      name: 'should handle notStatic',
      notStatic: true,
      mappings: {
        xyz123: '//cdn01.gitter.test/xyz123',
        abc123: '//cdn01.gitter.test/abc123'
      }
    },
    {
      name: 'should handle longTermCache',
      longTermCache: '1',
      mappings: {
        xyz123: '//cdn01.gitter.test/_s/lt/1/xyz123',
        abc123: '//cdn01.gitter.test/_s/lt/1/abc123'
      }
    }
  ];

  FIXTURES.forEach(function(meta) {
    Object.keys(meta.mappings).forEach(function(uri) {
      var expected = meta.mappings[uri];

      it(meta.name + ': ' + uri, function() {
        var actual = cdn(uri, {
          email: meta.email,
          nonrelative: meta.nonrelative,
          notStatic: meta.notStatic,
          longTermCache: meta.longTermCache
        });
        assert.strictEqual(actual, expected);
      });
    });
  });
});
