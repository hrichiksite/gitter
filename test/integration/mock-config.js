'use strict';

var events = require('events');

function MockConfig(hash) {
  this.hash = hash;
  this.events = new events.EventEmitter();
}

MockConfig.prototype.get = function(key) {
  var path = key.split(':');
  var root = this.hash;
  for (var i = 0; i < path.length; i++) {
    root = root[path[i]];
    if (root === null || root === undefined) return root;
  }
  return root;
};

module.exports = function(hash) {
  return new MockConfig(hash);
};
