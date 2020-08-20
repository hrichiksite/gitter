'use strict';

var assert = require('assert');

describe('room-membership-flags', function() {
  var underTest;
  before(function() {
    underTest = require('../lib/room-membership-flags');
  });

  describe('getModeFromFlags', function() {
    describe('strict', function() {
      var FIXTURES = {
        '1101101': 'all',
        '1111101': 'all', // Ignore other values
        '0000110': 'mute',
        '0010110': 'mute', // Ignore other values
        '0001101': 'announcement',
        '0011101': 'announcement', // Ignore other values
        '0101010': null
      };

      Object.keys(FIXTURES).forEach(function(flags) {
        var mode = FIXTURES[flags];

        it('should handle ' + flags + ' to ' + mode, function() {
          var result = underTest.getModeFromFlags(parseInt(flags, 2), true);
          assert.strictEqual(result, mode);
        });
      });
    });

    describe('not-strict', function() {
      var FIXTURES = {
        '0101101': 'all',
        '1101101': 'all',
        '1111101': 'all', // Ignore other values
        '1000110': 'mute',
        '0000110': 'mute',
        '0010110': 'mute', // Ignore other values
        '0001101': 'announcement',
        '0011101': 'announcement' // Ignore other values
      };

      Object.keys(FIXTURES).forEach(function(flags) {
        var mode = FIXTURES[flags];

        it('should handle ' + flags + ' to ' + mode, function() {
          var result = underTest.getModeFromFlags(parseInt(flags, 2), false);
          assert.strictEqual(result, mode);
        });
      });
    });
  });

  describe('getUpdateForMode', function() {
    var UNTOUCHED_BITS = '111111111111111111111';

    var FIXTURES = {
      'all-no-default': {
        mode: 'all',
        and: UNTOUCHED_BITS + '1101101',
        or: '1101101',
        lurk: false,
        isDefault: undefined
      },
      'announcement-no-default': {
        mode: 'announcement',
        and: UNTOUCHED_BITS + '0001101',
        or: '0001101',
        lurk: false,
        isDefault: undefined
      },
      'mention-no-default': {
        mode: 'mention',
        and: UNTOUCHED_BITS + '0001101',
        or: '0001101',
        lurk: false,
        isDefault: undefined
      },
      'mute-no-default': {
        mode: 'mute',
        and: UNTOUCHED_BITS + '0000110',
        or: '0000110',
        lurk: true,
        isDefault: undefined
      },

      // -------------------------------------------

      'all-is-default': {
        mode: 'all',
        and: UNTOUCHED_BITS + '1111101',
        or: '1111101',
        lurk: false,
        isDefault: true
      },
      'announcement-is-default': {
        mode: 'announcement',
        and: UNTOUCHED_BITS + '0011101',
        or: '0011101',
        lurk: false,
        isDefault: true
      },
      'mention-is-default': {
        mode: 'mention',
        and: UNTOUCHED_BITS + '0011101',
        or: '0011101',
        lurk: false,
        isDefault: true
      },
      'mute-is-default': {
        mode: 'mute',
        and: UNTOUCHED_BITS + '0010110',
        or: '0010110',
        lurk: true,
        isDefault: true
      },

      // -------------------------------------------

      'all-not-default': {
        mode: 'all',
        and: UNTOUCHED_BITS + '1101101',
        or: '1101101',
        lurk: false,
        isDefault: false
      },
      'announcement-not-default': {
        mode: 'announcement',
        and: UNTOUCHED_BITS + '0001101',
        or: '0001101',
        lurk: false,
        isDefault: false
      },
      'mention-not-default': {
        mode: 'mention',
        and: UNTOUCHED_BITS + '0001101',
        or: '0001101',
        lurk: false,
        isDefault: false
      },
      'mute-not-default': {
        mode: 'mute',
        and: UNTOUCHED_BITS + '0000110',
        or: '0000110',
        lurk: true,
        isDefault: false
      }
    };

    var FLAG_VALUES = [
      '0000000000000000000000000000',
      '1111111111111111111111111111',
      '1010101010101010101010101010',
      '1001001001001001001001001001'
    ];

    Object.keys(FIXTURES).forEach(function(testName) {
      var values = FIXTURES[testName];
      var mode = values.mode;

      it('should handle ' + testName, function() {
        var result = underTest.getUpdateForMode(mode, values.isDefault);
        assert.deepEqual(result, {
          $bit: {
            flags: {
              and: parseInt(values.and, 2),
              or: parseInt(values.or, 2)
            }
          }
        });

        FLAG_VALUES.forEach(function(flags) {
          var flagValue = parseInt(flags, 2);
          // Test for bit idempotency
          var result1 = (flagValue & parseInt(values.and, 2)) | parseInt(values.or, 2);
          var result2 = (flagValue | parseInt(values.or, 2)) & parseInt(values.and, 2);

          assert.strictEqual(result1.toString(2), result2.toString(2));
          var newMode = underTest.getModeFromFlags(result1);

          assert.strictEqual(
            newMode,
            mode === 'mention' ? 'announcement' : mode,
            'For flags ' + flags + ', expected mode ' + mode + ' got ' + newMode
          );
        });
      });
    });
  });

  describe('getLurkForFlags', function() {
    var FIXTURES = {
      '01101': false,
      '11101': false,
      '00100': true,
      '10100': true,
      '01110': true,
      '11110': true // Ignore other values
    };

    Object.keys(FIXTURES).forEach(function(flags) {
      var isLurking = FIXTURES[flags];

      it('should handle ' + flags, function() {
        var result = underTest.getLurkForFlags(parseInt(flags, 2));
        assert.strictEqual(result, isLurking);
      });
    });
  });

  describe('getLurkForMode', function() {
    var FIXTURES = {
      all: false,
      announcement: false,
      mention: false,
      mute: true
    };

    Object.keys(FIXTURES).forEach(function(mode) {
      var isLurking = FIXTURES[mode];

      it('should handle ' + mode, function() {
        var result = underTest.getLurkForMode(mode);
        assert.strictEqual(result, isLurking);
      });
    });
  });

  describe('getFlagsForMode', function() {
    var FIXTURES = {
      'all-default': {
        mode: 'all',
        default: true,
        value: '1111101'
      },
      'announcement-default': {
        mode: 'announcement',
        default: true,
        value: '11101'
      },
      'mention-default': {
        mode: 'mention',
        default: true,
        value: '11101'
      },
      'mute-default': {
        mode: 'mute',
        default: true,
        value: '10110'
      },

      /* ----------------------- */

      'all-not-default': {
        mode: 'all',
        default: false,
        value: '1101101'
      },
      'announcement-not-default': {
        mode: 'announcement',
        default: false,
        value: '1101'
      },
      'mention-not-default': {
        mode: 'mention',
        default: false,
        value: '1101'
      },
      'mute-not-default': {
        mode: 'mute',
        default: false,
        value: '110'
      }
    };

    Object.keys(FIXTURES).forEach(function(testName) {
      var values = FIXTURES[testName];

      it('should handle ' + testName, function() {
        var result = underTest.getFlagsForMode(values.mode, values.default);
        assert.strictEqual(result.toString(2), values.value);
      });
    });
  });

  describe('toggleLegacyLurkMode', function() {
    var FIXTURES = [
      {
        flags: '11101',
        lurk: true,
        expected: '11110'
      },
      {
        flags: '11111',
        lurk: true,
        expected: '11110'
      },
      {
        flags: '11110',
        lurk: true,
        expected: '11110'
      },
      {
        flags: '0',
        lurk: true,
        expected: '0'
      },
      {
        flags: '11101',
        lurk: false,
        expected: '11101'
      },
      {
        flags: '11111',
        lurk: false,
        expected: '11111'
      },
      {
        flags: '11110',
        lurk: false,
        expected: '11101'
      },
      {
        flags: '0',
        lurk: false,
        expected: '1'
      }
    ];

    FIXTURES.forEach(function(values, index) {
      it('should handle case ' + index, function() {
        var result = underTest.toggleLegacyLurkMode(parseInt(values.flags, 2), values.lurk);
        assert.strictEqual(result.toString(2), values.expected);
      });
    });
  });
});
