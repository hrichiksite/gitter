'use strict';

var memoryTokenProvider = require('../lib/tokens/memory-token-provider');

describe('memory-token-provider', function() {
  require('./provider-tests-common')(memoryTokenProvider);
});
