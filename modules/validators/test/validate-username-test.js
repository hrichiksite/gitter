'use strict';

const validateUsername = require('../lib/validate-username');
const assert = require('assert');

describe('validate-username', function() {
  const FIXTURES = {
    someusername: true,
    SOMEUSERNAME: true,
    someuser_gitlab: true,
    'someuser.ggg_gitlab': true,
    'spaces ': false,
    'colons:': false,
    '/sksk': false,
    '😗': false,
    'd😗': false,
    南部タチャイ島を閉鎖へ: true,
    张德江访因展示标语被捕: true,
    // reserved
    topics: false,
    archive: false
  };

  Object.keys(FIXTURES).forEach(function(key) {
    const result = FIXTURES[key];

    const name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateUsername(key), result);
    });
  });
});
