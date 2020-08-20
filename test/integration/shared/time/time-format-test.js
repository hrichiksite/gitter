'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var timeFormat = testRequire('../shared/time/time-format');

var DATE_DAY1_6AM = new Date('2015-06-16T06:00:00Z');
var DATE_DAY1_12PM = new Date('2015-06-16T12:00:00Z');
const DATE_DAY2_12AM = new Date('2015-06-17T00:00:00Z');
var DATE_DAY2_12PM = new Date('2015-06-17T12:00:00Z');
var DATE_NEXT_YEAR = new Date('2016-06-17T12:00:00Z');

var TEST_CASES = [
  {
    time: DATE_DAY1_6AM,
    now: DATE_DAY2_12PM,
    lang: null,
    offset: 0,
    compact: false,
    expected: 'Jun 16 06:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_DAY2_12PM,
    lang: 'fr',
    offset: 0,
    compact: true,
    expected: 'juin 16'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_DAY1_6AM,
    lang: 'en',
    offset: 480,
    compact: false,
    expected: '22:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_DAY1_12PM,
    lang: 'zh-CN',
    offset: 0,
    compact: false,
    expected: '06:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_DAY2_12PM,
    lang: 'zh-CN',
    offset: 480,
    compact: false,
    expected: '6月 15 22:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_DAY2_12PM,
    lang: 'zh-CN',
    offset: 480,
    compact: true,
    expected: '6月 15'
  },

  {
    time: DATE_DAY1_6AM,
    now: DATE_NEXT_YEAR,
    lang: null,
    offset: 0,
    compact: false,
    expected: 'Jun 16 2015 06:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_NEXT_YEAR,
    lang: 'fr',
    offset: 0,
    compact: true,
    expected: 'juin 16 2015'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_NEXT_YEAR,
    lang: 'en',
    offset: 480,
    compact: false,
    expected: 'Jun 15 2015 22:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_NEXT_YEAR,
    lang: 'zh-CN',
    offset: 0,
    compact: false,
    expected: '6月 16 2015 06:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_NEXT_YEAR,
    lang: 'zh-CN',
    offset: 480,
    compact: false,
    expected: '6月 15 2015 22:00'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_NEXT_YEAR,
    lang: 'zh-CN',
    offset: 480,
    compact: true,
    expected: '6月 15 2015'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_DAY1_6AM,
    lang: 'en',
    offset: 480,
    compact: false,
    forceUtc: true,
    expected: '06:00 UTC'
  },
  {
    time: DATE_DAY2_12AM,
    now: DATE_DAY2_12AM,
    lang: 'en',
    offset: 480,
    compact: false,
    forceUtc: true,
    expected: '00:00 UTC'
  },
  {
    time: DATE_DAY1_6AM,
    now: DATE_NEXT_YEAR,
    lang: 'en',
    offset: 480,
    compact: false,
    forceUtc: true,
    expected: 'Jun 16 2015 06:00 UTC'
  }
];

describe('time-format', function() {
  describe('fixtures', function() {
    TEST_CASES.forEach(function(test, index) {
      it('should pass test case #' + (index + 1), function() {
        var result = timeFormat(test.time, {
          lang: test.lang,
          tzOffset: test.offset,
          now: test.now,
          compact: test.compact,
          forceUtc: test.forceUtc
        });
        assert.strictEqual(result, test.expected);
      });
    });
  });
});
