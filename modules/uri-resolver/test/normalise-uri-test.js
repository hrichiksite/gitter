'use strict';

var normaliseUri = require('../lib/normalise-uri');
var assert = require('assert');

describe('normalise-uri', function() {
  var FIXTURES = [
    {
      given: 'gitterHQ/',
      parts: ['gitterHQ'],
      path: 'gitterHQ'
    },
    {
      given: 'gitterHQ',
      parts: ['gitterHQ'],
      path: 'gitterHQ'
    },
    {
      given: 'gitterHQ//',
      parts: ['gitterHQ'],
      path: 'gitterHQ'
    },
    {
      given: 'gitterHQ/x/',
      parts: ['gitterHQ', 'x'],
      path: 'gitterHQ/x'
    },
    {
      given: '/',
      parts: [],
      path: ''
    },
    {
      given: '//////',
      parts: [],
      path: ''
    }
  ];

  FIXTURES.forEach(function(fixture) {
    it('should handle ' + fixture.given, function() {
      assert.deepEqual(normaliseUri.toParts(fixture.given), fixture.parts);
      assert.strictEqual(normaliseUri.toPath(fixture.given), fixture.path);
    });
  });
});
