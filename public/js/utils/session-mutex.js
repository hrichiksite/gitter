'use strict';

var Promise = require('bluebird');
var localStore = require('../components/local-store');

var TIMEOUT = 60000;
var LOCK_WAIT_TIME = 16;
var uniq = Math.floor(Math.random() * 10000000);

function garbageCollection() {
  var now = Date.now();

  localStore.getKeys().forEach(function(key) {
    if (key.indexOf('lock:') !== 0) return;

    var value = localStore.get(key);
    if (!value) return;

    var pair = value.split('-');
    var lockDate = parseInt(pair[0], 10);

    if (lockDate && now - lockDate > TIMEOUT) {
      localStore.remove(key);
    }
  });
}

setInterval(garbageCollection, TIMEOUT * 3);

var sessionMutex = Promise.method(function(key) {
  var storageKey = 'lock:' + key;

  var k = localStore.get(storageKey);
  if (k) {
    return false;
  }

  var value = Date.now() + ':' + uniq;

  localStore.set(storageKey, value);

  // Do we still hold the lock?
  return Promise.delay(LOCK_WAIT_TIME).then(function() {
    if (localStore.get(storageKey) === value) {
      Promise.delay(10000).then(function() {
        localStore.remove('lock:' + key);
      });

      return true;
    }
  });
});

module.exports = sessionMutex;
