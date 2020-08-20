'use strict';

var selectCacheCandidates = require('./select-cache-candidates');
var assert = require('assert');

describe('select-cache-candidates', function() {
  it('should handle an empty array', function() {
    assert.deepEqual(selectCacheCandidates(10, []), []);
  });

  it('should handle valid values', function() {
    var rooms = [
      {
        id: '1',
        lastAccess: 1
      },
      {
        id: '2',
        lastAccess: 2
      },
      {
        id: '3',
        lastAccess: 3
      },
      {
        id: '4',
        lastAccess: 4
      }
    ];

    assert.deepEqual(selectCacheCandidates(10, rooms), [
      {
        id: '4',
        lastAccess: 4
      },
      {
        id: '3',
        lastAccess: 3
      },
      {
        id: '2',
        lastAccess: 2
      },
      {
        id: '1',
        lastAccess: 1
      }
    ]);
  });

  it('should ignore rooms without a lastAccess or id', function() {
    var rooms = [
      {
        lastAccess: 1
      },
      {
        id: '2',
        lastAccess: 2
      },
      {
        id: '3'
      },
      {
        id: '4',
        lastAccess: 4
      }
    ];

    assert.deepEqual(selectCacheCandidates(10, rooms), [
      {
        id: '4',
        lastAccess: 4
      },
      {
        id: '2',
        lastAccess: 2
      }
    ]);
  });

  it('should truncate the list to the specified size', function() {
    var rooms = [
      {
        id: '1',
        lastAccess: 1
      },
      {
        id: '2',
        lastAccess: 2
      },
      {
        id: '3',
        lastAccess: 3
      },
      {
        id: '4',
        lastAccess: 4
      }
    ];

    assert.deepEqual(selectCacheCandidates(2, rooms), [
      {
        id: '4',
        lastAccess: 4
      },
      {
        id: '3',
        lastAccess: 3
      }
    ]);
  });
});
