'use strict';

/**
 * Some browsers throw horrible exceptions on localStorage access.
 * This is a shim to dealing with this
 */

var TEST_KEY = '_drafty_test_key';

var windowLocalStorage;

try {
  windowLocalStorage = window.localStorage;
} catch (e) {
  /* */
}

/* Attempts to use localStorage to check whether it's actually available for use */
function isLocalStorageAvailable() {
  if (!windowLocalStorage) return false;
  try {
    windowLocalStorage[TEST_KEY] = 1;
    windowLocalStorage.removeItem(TEST_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/* Null storage driver for when localStorage isn't available */
function InMemoryStore() {
  this.values = {};
}

InMemoryStore.prototype = {
  get: function(key) {
    return this.values[key] || '';
  },
  set: function(key, value) {
    this.values[key] = value;
  },
  remove: function(key) {
    delete this.values[key];
  },
  getKeys: function() {
    return Object.keys(this.values);
  }
};

/* Localstorage, the default driver */
function LocalStorageStore() {}

LocalStorageStore.prototype = {
  get: function(key) {
    try {
      return windowLocalStorage[key] || '';
    } catch (e) {
      return '';
    }
  },

  set: function(key, value) {
    try {
      windowLocalStorage[key] = value;
    } catch (e) {
      /* */
    }
  },

  remove: function(key) {
    try {
      windowLocalStorage.removeItem(key);
    } catch (e) {
      /* */
    }
  },

  getKeys: function() {
    try {
      var len = windowLocalStorage.length;
      var result = [];
      for (var i = 0; i < len; i++) {
        var key = windowLocalStorage.key(i);
        result.push(key);
      }

      return result;
    } catch (e) {
      return [];
    }
  }
};

module.exports = isLocalStorageAvailable() ? new LocalStorageStore() : new InMemoryStore();
