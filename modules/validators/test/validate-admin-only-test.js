'use strict';

var validateAdminOnly = require('../lib/validate-admin-only');
var assert = require('assert');

describe('validate-admin-only', function() {
  var FIXTURES = [
    [true, true],
    [false, true],
    [undefined, true],
    ['', false],
    ['foo', false],
    [null, false],
    [0, false],
    [1, false],
    [-1, false],
    [{}, false],
    [[], false]
  ];

  FIXTURES.forEach(function(fixture) {
    var input = fixture[0];
    var result = fixture[1];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + input, function() {
      assert.strictEqual(validateAdminOnly(input), result);
    });
  });
});
