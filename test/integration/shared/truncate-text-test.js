'use strict';

const truncateText = require('../test-require')('gitter-web-shared/truncate-text');
const assert = require('assert');

describe('truncate-text', function() {
  it('leave the string alone if below threshold', function() {
    assert.equal(truncateText('foo', 9), 'foo');
  });

  it('leave the string alone if at threshold', function() {
    assert.equal(truncateText('foobarbaz', 9), 'foobarbaz');
  });

  it('ellipsis text over threshold', function() {
    assert.equal(truncateText('foobarbazqux', 9), 'foobar...');
  });
});
