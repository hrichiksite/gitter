'use strict';

var assert = require('assert');

function assertSerializedEqual(value, expected) {
  assert.strictEqual(JSON.stringify(value, null, '  '), JSON.stringify(expected, null, '  '));
}

exports.assertSerializedEqual = assertSerializedEqual;
