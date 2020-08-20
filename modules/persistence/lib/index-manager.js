'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:infra:persistence:indexes');
var _ = require('lodash');

function getExtraIndices(schema) {
  var result = [];
  if (schema.extraIndices) {
    result = result.concat(schema.extraIndices);
  }
  schema.eachPath(function(key, path) {
    if (path.schema && path.schema.extraIndices) {
      result = result.concat(path.schema.extraIndices);
    }
  });

  return result;
}

// See http://mongoosejs.com/docs/guide.html#indexes for
// more information....

function ensureIndices(models) {
  return Promise.map(
    models,
    function(model) {
      debug('Processing %s', model.modelName);
      return model.ensureIndexes().then(function() {
        var extraIndices = getExtraIndices(model.schema);

        return Promise.map(
          extraIndices,
          function(extraIndex) {
            debug('Processing extra index on %s: %j', model.modelName, extraIndex);

            return model.collection.createIndex(extraIndex.keys, extraIndex.options);
          },
          { concurrency: 1 }
        );
      });
    },
    { concurrency: 1 }
  );
}

function reconcileSpecToActual(spec, actual) {
  var result = [];
  actual = actual.slice();

  spec.forEach(function(specIndex) {
    var index = _.findIndex(actual, function(actualIndex) {
      if (!_.isEqual(specIndex.keys, actualIndex.key)) return false;

      if (Boolean(specIndex.options.unique) !== Boolean(actualIndex.unique)) return false;
      if (Boolean(specIndex.options.sparse) !== Boolean(actualIndex.sparse)) return false;

      if (specIndex.options.partialFilterExpression) {
        if (
          !_.isEqual(specIndex.options.partialFilterExpression, actualIndex.partialFilterExpression)
        )
          return false;
      } else {
        if (actualIndex.partialFilterExpression) return false;
      }

      return true;
    });

    if (index >= 0) {
      actual.splice(index, 1);
    } else {
      result.push({
        missing: {
          keys: specIndex.keys,
          options: specIndex.options
        }
      });
    }
  });

  actual.forEach(function(actualIndex) {
    if (_.isEqual(actualIndex.key, { _id: 1 }) && actualIndex.name === '_id_') return;

    result.push({
      extra: {
        keys: actualIndex.key,
        options: _.omit(actualIndex, ['key', 'ns', 'v'])
      }
    });
  });

  return result;
}

/**
 * This should only be called from `scripts/utils/reconcile-mongodb-indexes.js`
 */
function reconcileIndices(models) {
  return Promise.map(
    models,
    function(model) {
      return Promise.fromCallback(function(cb) {
        model.collection.indexes(cb);
      })
        .then(function(indexes) {
          var specIndices = model.schema
            .indexes()
            .map(function(mongooseIndex) {
              return {
                keys: mongooseIndex[0],
                options: mongooseIndex[1]
              };
            })
            .concat(getExtraIndices(model.schema));

          var reconciled = reconcileSpecToActual(specIndices, indexes);
          return {
            name: model.modelName,
            changes: reconciled
          };
        })
        .catch(function(e) {
          // If mongodb doesn't know about the collection,
          // don't reconcile the indexes on it!
          if (e.message !== 'no collection') throw e;

          return [];
        });
    },
    { concurrency: 1 }
  ).then(function(reconciled) {
    return reconciled.filter(function(item) {
      return item.changes && item.changes.length;
    });
  });
}

module.exports = {
  ensureIndices: ensureIndices,
  reconcileIndices: reconcileIndices
};
