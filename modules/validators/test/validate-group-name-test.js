'use strict';

var validateRoomName = require('../lib/validate-group-name');
var assert = require('assert');

describe('validate-group-name', function() {
  var FIXTURES = {
    bob: true,
    '38217891729387129873128379123987123912389': true,
    ' 333': false,
    '333': true
  };

  var REALLY_LONG_NAME =
    '3821789172938712987312837912398382178917293871298731283791239' +
    '8712391238938217891729387129873128379123987123912389382178917293871298731283791239';
  FIXTURES[REALLY_LONG_NAME] = false;

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateRoomName(key), result);
    });
  });
});
