/*jslint node: true */
'use strict';

var assert = require('assert');
var workerQueue = require('../lib/worker-queue-redis');
var uuid = require('uuid/v4');

describe('redis-batcher', function() {
  // queue takes a while to start up
  this.timeout(30000);

  before(function() {
    workerQueue.startScheduler();
  });

  it('should batch tasks together #slow', function(done) {
    var RedisBatcher = require('../lib/redis-batcher').RedisBatcher;

    function batchFn(key, items, cb) {
      cb();
      count++;

      assert.equal(items.length, 4, 'Expected 4 items');
      assert(items.indexOf('a') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));
      assert(items.indexOf('b') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));
      assert(items.indexOf('c') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));
      assert(items.indexOf('d') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));

      switch (count) {
        case 1:
          underTest.add('chat:1', 'a');
          underTest.add('chat:1', 'b');
          underTest.add('chat:1', 'c');
          underTest.add('chat:1', 'd');
          break;

        case 2:
          return done();
      }
    }

    var underTest = new RedisBatcher('test1-' + uuid(), 0, batchFn);
    var count = 0;
    underTest.listen();

    underTest.add('chat:1', 'a');
    underTest.add('chat:1', 'b');
    underTest.add('chat:1', 'c');
    underTest.add('chat:1', 'd');
  });

  it('should keep separate keys separate #slow', function(done) {
    var RedisBatcher = require('../lib/redis-batcher').RedisBatcher;

    function batchFn(key, items, cb) {
      cb();
      keys[key] = true;

      assert(items.length === 2, 'Expected 2 items');

      if (key === 'chat:1') {
        assert(items.indexOf('a') >= 0, 'Expected items a,b got ' + items.join(','));
        assert(items.indexOf('b') >= 0, 'Expected items a,b got ' + items.join(','));
      } else {
        assert(items.indexOf('c') >= 0, 'Expected items c,d, got ' + items.join(','));
        assert(items.indexOf('d') >= 0, 'Expected items c,d, got ' + items.join(','));
      }

      if (keys['chat:1'] && keys['chat:2']) {
        return done();
      }
    }

    var underTest = new RedisBatcher('test2-' + uuid(), 0, batchFn);

    var keys = {};
    underTest.listen();

    underTest.add('chat:1', 'a');
    underTest.add('chat:1', 'b');
    underTest.add('chat:2', 'c');
    underTest.add('chat:2', 'd');
  });

  after(function(done) {
    workerQueue.stopScheduler(done);
  });
});
