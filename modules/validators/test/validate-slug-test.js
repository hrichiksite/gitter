'use strict';

var validateSlug = require('../lib/validate-slug');
var assert = require('assert');

describe('validate-slug', function() {
  var FIXTURES = {
    'i-love-cats': true,
    'I love cats': false,
    'I-Love-Cats': false,
    '': false,
    ' ': false
  };

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateSlug(key), result);
    });
  });

  it('should not validate things that are not strings', function() {
    assert.strictEqual(validateSlug({ foo: 'bar' }), false);
    assert.strictEqual(validateSlug([]), false);
    assert.strictEqual(validateSlug(100), false);
    assert.strictEqual(validateSlug(undefined), false);
    assert.strictEqual(validateSlug(null), false);
  });
});
