'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var isToday = testRequire('../shared/time/is-today');
var moment = require('moment');

var TEST_CASES = [
  { time: '2015-06-17T00:00:00-08:00', now: '2015-06-17T00:00:00Z', expected: false },
  { time: '2015-06-17T00:00:00-08:00', now: '2015-06-17T08:00:00Z', expected: true },
  { time: '2015-06-17T00:00:00+11:00', now: '2015-06-17T13:00:00Z', expected: false },
  { time: '2015-06-17T00:00:00+11:00', now: '2015-06-17T00:00:00Z', expected: true }
];

describe('is-today', function() {
  describe('fixtures', function() {
    TEST_CASES.forEach(function(test, index) {
      it('should pass test case #' + (index + 1), function() {
        var time = moment.parseZone(test.time);
        var now = new Date(test.now).valueOf();
        var result = isToday(time, now);
        assert.strictEqual(test.expected, result);
      });
    });
  });
});
