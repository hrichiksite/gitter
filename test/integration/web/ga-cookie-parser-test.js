'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var underTest = testRequire('./web/ga-cookie-parser');

describe('ga-cookie-parser-test', function() {
  it('should handle requests without cookies', function() {
    var a = underTest({});
    assert.strictEqual(a, undefined);
  });

  it('should handle requests without a _ga cookie', function() {
    var a = underTest({ cookies: {} });
    assert.strictEqual(a, undefined);
  });

  it('should handle requests with a _ga cookie', function() {
    var a = underTest({ cookies: { _ga: 'GA1.2.468725391.1404216241' } });
    assert.strictEqual(a, '468725391.1404216241');
  });
});
