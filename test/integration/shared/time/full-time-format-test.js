'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var fullTimeFormat = testRequire('../shared/time/full-time-format');

var DATE_DAY1_6AM = new Date('2015-06-16T06:00:00Z');

var TEST_CASES = [
  { time: DATE_DAY1_6AM, lang: null, offset: 0, expected: 'June 16, 2015 6:00 AM' },
  { time: DATE_DAY1_6AM, lang: 'fr', offset: 0, expected: '16 juin 2015 06:00' },
  { time: DATE_DAY1_6AM, lang: 'en', offset: 480, expected: '15 June 2015 22:00' },
  { time: DATE_DAY1_6AM, lang: 'zh-CN', offset: 0, expected: '2015年6月16日早上6点00分' },
  { time: DATE_DAY1_6AM, lang: 'zh-CN', offset: 480, expected: '2015年6月15日晚上10点00分' },
  { time: DATE_DAY1_6AM, lang: 'zh-CN', offset: 480, expected: '2015年6月15日晚上10点00分' }
];

describe('time-format', function() {
  describe('fixtures', function() {
    TEST_CASES.forEach(function(test, index) {
      it('should pass test case #' + (index + 1), function() {
        var result = fullTimeFormat(test.time, { lang: test.lang, tzOffset: test.offset });
        assert.strictEqual(test.expected, result);
      });
    });
  });
});
