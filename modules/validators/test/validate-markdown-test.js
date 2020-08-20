'use strict';

var validateMarkdown = require('../lib/validate-markdown');
var assert = require('assert');

describe('validate-markdown', function() {
  var FIXTURES = {
    'I love cats': true,
    '': true
  };

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateMarkdown(key), result);
    });
  });

  it('should not validate things that are not strings', function() {
    assert.strictEqual(validateMarkdown({ foo: 'bar' }), false);
    assert.strictEqual(validateMarkdown([]), false);
    assert.strictEqual(validateMarkdown(100), false);
    assert.strictEqual(validateMarkdown(undefined), false);
    assert.strictEqual(validateMarkdown(null), false);
  });
});
