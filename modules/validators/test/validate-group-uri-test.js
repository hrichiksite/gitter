'use strict';

var validateGroupUri = require('../lib/validate-group-uri');
var assert = require('assert');

describe('validate-group-uri', function() {
  var FIXTURES = {
    api: false,
    API: false,
    '😗': false,
    'd😗': false,
    南部タチャイ島を閉鎖へ: true,
    '/sksk': false,
    张德江访因展示标语被捕: true,
    'spaces ': false,
    'colons:': false,
    topics: false,
    archive: false
  };

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateGroupUri(key), result);
    });
  });
});
