'use strict';

var slugify = require('../lib/slugify');
var assert = require('assert');

describe('slugify', function() {
  var FIXTURES = {
    'I love cats': 'i-love-cats',
    'i-love-cats': 'i-love-cats',
    'I-Love-Cats': 'i-love-cats',
    '': '',
    ' ': ''
  };

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = 'should convert';

    it(name + ' ' + key, function() {
      assert.strictEqual(slugify(key), result);
    });
  });

  it('should not validate things that are not strings', function() {
    assert.strictEqual(slugify({ foo: 'bar' }), '');
    assert.strictEqual(slugify([]), '');
    assert.strictEqual(slugify(100), '');
    assert.strictEqual(slugify(undefined), '');
    assert.strictEqual(slugify(null), '');
  });
});
