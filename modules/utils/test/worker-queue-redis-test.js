/*jslint node: true */
/*global describe:true, it: true, before:true, after:true */
'use strict';

var workerQueue = require('../lib/worker-queue-redis');
var uuid = require('uuid/v4');

describe('worker-queue-redis', function() {
  // queue takes a while to start up
  this.timeout(10000);

  before(function() {
    workerQueue.startScheduler();
  });

  it('should echo data back #slow', function(done) {
    var data = 'test data ' + uuid();

    var queue = workerQueue.queue('worker-queue-redis-test-1', {}, function() {
      return function(result, queuedone) {
        queuedone();

        // there might me some old data, so we wait for ours
        if (result === data) {
          done();
        }
      };
    });
    queue.listen();

    queue.invoke(data, { delay: 0 });
  });

  it('should callback when invoked #slow', function(done) {
    var data = 'test data ' + uuid();

    var queue = workerQueue.queue('worker-queue-redis-test-2', {}, function() {
      return function(result, queuedone) {
        queuedone();
      };
    });

    queue.invoke(data, { delay: 0 }, function() {
      done();
    });
  });

  after(function(done) {
    workerQueue.stopScheduler(done);
  });
});
