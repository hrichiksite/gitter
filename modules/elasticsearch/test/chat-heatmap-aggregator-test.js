'use strict';

var chatHeatmapAggregator = require('../lib/chat-heatmap-aggregator');

describe('chat-heatmap-aggregator', function() {
  describe('integration tests #slow', function() {
    it('does not crash', function() {
      return chatHeatmapAggregator.getHeatmapForRoom('1');
    });
  });
});
