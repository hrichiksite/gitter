'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var isolateBurst = testRequire('../shared/burst/isolate-burst-array');

describe('isolate-burst-array', function() {
  function id(collection) {
    return collection.map(function(item) {
      return item.id;
    });
  }

  it('should deal with empty arrays', function() {
    var fixture = [];
    var model = { id: '1' };
    var result = isolateBurst(fixture, model);

    assert.deepEqual(id(result), [1]);
  });

  it('should deal with single arrays', function() {
    var model = { id: '1' };
    var fixture = [model];
    var result = isolateBurst(fixture, model);

    assert.deepEqual(id(result), [1]);
  });

  it('should deal with bursts in the middle', function() {
    var model = { id: '1', burstStart: true };
    var fixture = [{ id: 0 }, model, { id: 2 }, { id: 3, burstStart: true }];
    var result = isolateBurst(fixture, model);

    assert.deepEqual(id(result), [1, 2]);
  });

  it('should deal with messages in the middle of a burst', function() {
    var model = { id: '1' };
    var fixture = [{ id: 0, burstStart: true }, model, { id: 2 }, { id: 3, burstStart: true }];
    var result = isolateBurst(fixture, model);

    assert.deepEqual(id(result), [0, 1, 2]);
  });

  it('should deal with messages at the bottom', function() {
    var model = { id: '1' };
    var fixture = [{ id: 0, burstStart: true }, model, { id: 2 }, { id: 3 }];
    var result = isolateBurst(fixture, model);

    assert.deepEqual(id(result), [0, 1, 2, 3]);
  });
});
