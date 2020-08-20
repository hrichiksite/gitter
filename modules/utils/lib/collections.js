'use strict';

exports.keys = function(object) {
  var k = [];
  for (var i in object)
    if (object.hasOwnProperty(i)) {
      k.push(i);
    }
  return k;
};

exports.extract = function(propertyName) {
  return function(item) {
    return item[propertyName];
  };
};

/** Take an array and hash it by it's ID */
exports.indexById = function(array) {
  if (!array || !array.length) return {};
  var len = array.length;

  var a = {};
  for (var i = 0; i < len; i++) {
    var item = array[i];
    if (item) {
      a[item.id || item._id] = item;
    }
  }

  return a;
};

/** Take an array and hash it by the supplied property */
exports.indexByProperty = function(array, propertyName) {
  if (!array || !array.length) return {};
  var len = array.length;

  var a = {};
  for (var i = 0; i < len; i++) {
    var item = array[i];
    if (item) {
      a[item[propertyName]] = item;
    }
  }

  return a;
};

/** Take an array and turn it into a set-like hash */
exports.hashArray = function(array) {
  if (!array || !array.length) return {};
  var len = array.length;

  var a = {};
  for (var i = 0; i < len; i++) {
    var item = array[i];
    a[item] = true;
  }
  return a;
};

/**
 * Given a list of ids and a list full results,
 * return the array of full results in the
 * same order as the ids
 */
exports.maintainIdOrder = function(ids, results) {
  var resultsIndexed = exports.indexById(results);
  return ids
    .map(function(id) {
      return resultsIndexed[id];
    })
    .filter(function(f) {
      return !!f;
    });
};

exports.predicates = {
  notNull: function(v) {
    return v !== null && v !== undefined;
  }
};
