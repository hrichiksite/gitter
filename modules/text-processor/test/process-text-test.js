'use strict';

var processText = require('../lib/process-text');

var assert = require('assert');

describe('process-text', function() {
  var FIXTURES = [
    ['I love cats', 'I love cats'],
    ['', ''],
    [' ', ''],
    [{ foo: 'bar' }, '[object Object]'],
    [[], ''],
    [100, '100'],
    [undefined, ''],
    [null, '']
  ];

  FIXTURES.forEach(function(f) {
    var key = f[0];
    var result = f[1];

    var name = 'should convert';

    it(name + ' ' + key, function() {
      return processText(key).then(function(parsed) {
        assert.strictEqual(parsed.html, result);
      });
    });
  });
});
