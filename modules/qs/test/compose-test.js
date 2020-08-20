'use strict';

const assert = require('assert');
const compose = require('../compose');

describe('qs/compose', function() {
  it('composes query string from parameters', () => {
    assert.equal(compose({ foo: 'bar', hey: 'hello' }), '?foo=bar&hey=hello');
  });

  it('omits undefined parameters', () => {
    assert.equal(compose({ foo: 'bar', hey: undefined }), '?foo=bar');
  });

  it('returns empty string when invoked with no parameters', () => {
    assert.equal(compose({}), '');
  });
});
