'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var normalizeRedirect = testRequire('./handlers/uri-context/normalise-redirect');

describe('normalise-redirect', function() {
  it('deals with chinese characters', function() {
    var input = '/Luzifer1984/路';
    var output = normalizeRedirect(input, {
      path: '/Luzifer1984/路/~chat',
      query: {
        a: '路',
        b: 'bob'
      }
    });

    assert.strictEqual(output, '/Luzifer1984/%E8%B7%AF/~chat?a=%E8%B7%AF&b=bob');
  });

  it('handle the normal case', function() {
    var input = '/a/b';
    var output = normalizeRedirect(input, {
      path: '/gitterHQ'
    });
    assert.strictEqual(output, '/a/b');
  });

  it('deals with query strings', function() {
    var input = '/a/b';
    var output = normalizeRedirect(input, {
      path: '/gitterHQ/~chat',
      query: {
        test: 'hello there'
      }
    });
    assert.strictEqual(output, '/a/b/~chat?test=hello%20there');
  });
});
