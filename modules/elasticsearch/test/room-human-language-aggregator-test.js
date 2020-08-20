'use strict';

var roomHumanLanguageAggregator = require('../lib/room-human-language-aggregator');

describe('room-human-language-aggregator', function() {
  describe('integration tests #slow', function() {
    it('does not crash', function() {
      return roomHumanLanguageAggregator('1');
    });
  });
});
