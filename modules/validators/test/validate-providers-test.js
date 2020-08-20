'use strict';

var validateProviders = require('../lib/validate-providers');
var assert = require('assert');

describe('validate-providers', function() {
  var FIXTURES = [
    [[], true],
    [['github'], true],
    [['twitter'], false],
    [['gitlab'], false],
    [['github', 'twitter', 'gitlab'], false],
    ['', false],
    [{}, false],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
    [1, false],
    [0, false]
  ];

  FIXTURES.forEach(function(f) {
    var input = f[0];
    var result = f[1];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + JSON.stringify(input), function() {
      assert.strictEqual(validateProviders(input), result);
    });
  });
});
