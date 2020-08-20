/**
 * Mock implementation of redis-batcher
 */
'use strict';

function Controller() {
  var mocks = {};

  function MockRedisBatcher(name) {
    this.queues = {};
    this.name = name;
    if (mocks[name])
      throw new Error('Mock batcher with name ' + name + ' already exists. Did you call destroy?');
    mocks[name] = this;
  }

  MockRedisBatcher.prototype.add = function(queueName, items) {
    var queue = this.queues[queueName];
    if (queue) {
      queue.push.apply(queue, items);
    } else {
      this.queues[queueName] = items.slice();
    }
  };

  MockRedisBatcher.prototype.getItems = function(queueName) {
    var queue = this.queues[queueName];
    return queue || [];
  };

  MockRedisBatcher.prototype.clear = function() {
    this.queues = {};
  };

  MockRedisBatcher.prototype.destroy = function() {
    if (mocks[this.name] === this) {
      delete mocks[this.name];
    }
  };

  this.RedisBatcher = MockRedisBatcher;
  this.getMock = function(name) {
    return mocks[name];
  };
}

module.exports = Controller;
