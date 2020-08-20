// Ensure that sechash is backwards compatible
'use strict';

var sechash = require('sechash');
var assert = require('assert');

describe('sechash', function() {
  var FIXTURE_HASH_V0_1_3 =
    '276de3:sha512:3000:e9bb2b66009b552d1045d0271cc26aa5904299856b8a7d4ab8fb061261f8c652d1e3a2593b31c0e5bbdc7f2a7dba9b5c78af5b61ebf7d33d8da3f366a99a09ca';
  var TEST_VALUE = '12345678901234567890';

  it('should handle hashes created with sechash v0.1.3', function(done) {
    sechash.testHash(TEST_VALUE, FIXTURE_HASH_V0_1_3, function(err, isMatch) {
      if (err) return done(err);
      assert.strictEqual(isMatch, true);
      done();
    });
  });
});
