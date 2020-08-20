'use strict';

var validateRoomName = require('../lib/validate-room-name');
var assert = require('assert');

describe('validate-room-name', function() {
  var FIXTURES = {
    foo: true,
    '321212332-1231223': true,
    hasunderscoreatend_: true,
    _underscoreatstart: true,
    'anythingwitha~': false,
    'anythingwitha@': false,
    '😗': false,
    南部タチャイ島を閉鎖へ: true,
    '/sksk': false,
    张德江访因展示标语被捕: true,
    'spaces ': false,
    'colons:': false,
    topics: false,
    archive: false,
    'has.period': true,
    'hasperiodatend.': true,
    '.hasperiodatstart': true
  };

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateRoomName(key), result);
    });
  });
});
