'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var log = require('./log');

function createThrottledSave(model, saveFn) {
  return _.throttle(
    function() {
      return Promise.try(function() {
        return saveFn.call(model);
      }).catch(function(err) {
        log.error('Auto model save failed: ' + err);
      });
    },
    1500,
    { leading: false }
  );
}

function autoModelSave(model, persistentProperties, saveFn) {
  var persistentHash = persistentProperties.reduce(function(memo, name) {
    memo[name] = true;
    return memo;
  }, {});

  var throttledSave = createThrottledSave(model, saveFn);

  model.listenTo(model, 'change', function() {
    if (!model.changed) return;
    var changedKeys = Object.keys(model.changed);

    var hasPersistentChanges = changedKeys.some(function(name) {
      return persistentHash[name];
    });

    if (!hasPersistentChanges) {
      // No persistent changes? Do not bother saving
      return;
    }

    throttledSave();
  });
}

module.exports = autoModelSave;
