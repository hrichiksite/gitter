'use strict';

var detectTimezone = require('./detect-timezone');
var assert = require('assert');

describe('timezone-detect', function() {
  it('should detect timezones', function() {
    var result = detectTimezone();
    assert(result.abbr);
    // assert(result.iana); Unable to test in nodejs
    assert.strictEqual(typeof result.offset, 'string');
    assert(result.offset.match(/^[+-]\d{4}$/));
  });
});
