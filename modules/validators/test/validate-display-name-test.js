'use strict';

var validateDisplayName = require('../lib/validate-display-name');
var assert = require('assert');

describe('validate-display-name', function() {
  var FIXTURES = {
    'I love cats': true,
    ' I love cats': false,
    'I love cats ': false,
    'I am a category': true,
    ' ': false,
    '': false
  };

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateDisplayName(key), result);
    });
  });

  it('should not validate things that are not strings', function() {
    assert.strictEqual(validateDisplayName({ foo: 'bar' }), false);
    assert.strictEqual(validateDisplayName([]), false);
    assert.strictEqual(validateDisplayName(100), false);
    assert.strictEqual(validateDisplayName(undefined), false);
    assert.strictEqual(validateDisplayName(null), false);
  });
});
