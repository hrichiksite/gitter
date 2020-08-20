'use strict';

var validateSticky = require('../lib/validate-sticky');
var assert = require('assert');

describe('validate-sticky', function() {
  var FIXTURES = [
    ['', false],
    ['foo', false],
    [false, false],
    [null, true],
    [undefined, true],
    [0, true],
    [1, true],
    [-1, false],
    [{}, false],
    [[], false]
  ];

  FIXTURES.forEach(function(fixture) {
    var input = fixture[0];
    var result = fixture[1];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + input, function() {
      assert.strictEqual(validateSticky(input), result);
    });
  });
});
