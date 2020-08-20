'use strict';

var assert = require('assert');
var Promise = require('bluebird');

function memoizePromise(name, fn) {
  assert(fn.length === 0, 'memoizedPromise cannot be used on functions that take arguments');
  var promiseName = '_' + name + 'Memoized';

  return function memoizedPromise() {
    if (this[promiseName]) return this[promiseName];

    var promise = (this[promiseName] = Promise.resolve(fn.call(this)));
    return promise;
  };
}

function unmemoize(self, name) {
  var promiseName = '_' + name + 'Memoized';
  self[promiseName] = null;
}

module.exports = memoizePromise;
module.exports.unmemoize = unmemoize;
