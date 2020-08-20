'use strict';

var ObjectID = require('mongodb').ObjectID;
var _ = require('lodash');

function objectIDsEqual(a, b) {
  if (a === b) return true;
  if (!a) return !b;
  if (!b) return false;

  if (typeof a === 'string') {
    if (typeof b === 'string') {
      return a === b;
    }

    return b.equals(a);
  }

  // So, different versions of mongodb.ObjectID don't match as equal
  if (a.constructor === b.constructor) {
    return a.equals(b);
  } else {
    if (typeof b === 'string') {
      return a.equals(b);
    } else if (b.toHexString) {
      return a.equals(b.toHexString());
    } else {
      return a.equals(b);
    }
  }
}

function stringToObjectID(string) {
  try {
    return new ObjectID(string);
  } catch (e) {
    throw new Error('Invalid ObjectID ' + string);
  }
}

function asObjectID(id) {
  if (!id) {
    return null;
  }

  if (typeof id === 'string') {
    return stringToObjectID(id);
  }

  return id;
}

function asObjectIDs(ids) {
  return ids.map(function(id) {
    return asObjectID(id);
  });
}

function getDateFromObjectId(id) {
  if (!id) {
    return null;
  }

  if (typeof id === 'string') {
    var objectId = stringToObjectID(id);
    return objectId.getTimestamp();
  }

  return id.getTimestamp();
}

function getTimestampFromObjectId(id) {
  var d = getDateFromObjectId(id);
  if (d) return d.getTime();

  return null;
}

function getNewObjectIdString() {
  var objectId = new ObjectID();
  return objectId.valueOf();
}

/**
 * Checks to see whether something is either a String or ObjectID (hence ObjectID-like)
 */
function isLikeObjectId(value) {
  // value instanceof Object doesn't always work, so we'll do something a bit more hacky
  if (!value) return false;

  if ((value && value._bsontype === 'ObjectID') || value instanceof ObjectID) {
    return true;
  }

  if (typeof value === 'string' || value instanceof String) {
    // Avoid an expensive try-catch if possible
    if (value.length !== 24) return false;

    return /^[0-9a-fA-F]{24}$/.test(value);
  }

  return false;
}

function serializeObjectId(id) {
  if (!id) return id;
  if (typeof id === 'string') {
    return id;
  }
  return id.toString();
}

function serializeObjectIds(ids) {
  if (!ids || !ids.length) return [];

  return ids.map(serializeObjectId);
}

function createIdForTimestampString(timestamp) {
  var hexSeconds = Math.floor(timestamp / 1000).toString(16);

  while (hexSeconds.length < 8) {
    hexSeconds = '0' + hexSeconds;
  }
  return hexSeconds + '0000000000000000';
}

function createIdForTimestamp(timestamp) {
  return new ObjectID(createIdForTimestampString(timestamp));
}

let currentIncrement = 0;
function createTestIdForTimestampString(timestamp) {
  var hexSeconds = Math.floor(timestamp / 1000).toString(16);

  while (hexSeconds.length < 8) {
    hexSeconds = '0' + hexSeconds;
  }
  currentIncrement++;
  return hexSeconds + _.padLeft(currentIncrement.toString(16), 16, '0');
}

function fieldInPredicate(fieldName, values, additionalClauses) {
  var predicate = {};
  if (values.length === 1) {
    predicate[fieldName] = values[0];
  } else {
    predicate[fieldName] = { $in: values };
  }

  if (!additionalClauses) {
    return predicate;
  }

  return _.defaults(predicate, additionalClauses);
}

function setId(model) {
  if (!model) return model;
  model.id = serializeObjectId(model._id || model.id);
  return model;
}

function setIds(array) {
  array.forEach(function(f) {
    if (!f) return;
    f.id = serializeObjectId(f._id || f.id);
  });
  return array;
}

/**
 * Given a set of conjunctions, attempts to return a mongo-efficient form of
 * the query.
 *
 * So imagine you want to query for a set of user rooms, like
 * userId: X1, roomId: Y1
 * userId: X2, roomId: Y2
 * userId: X3, roomId: Y3
 *
 * The default query would be
 * `{ $or: [{ userId: X1, roomId: Y1 }, { userId: X2, roomId: Y2 }, etc ]}`
 *
 * Unfortunately, mongo will attempt to handle this conjunction by issuing
 * `n` parallel queries, which is very inefficient, especially if the
 * one of the terms in all the queries is common
 *
 * This method will attempt to group the terms either by the first term
 * or the second, if it's possible to do so.
 *
 * For example, if all the roomId terms are equal, it is much faster to ask
 * mongo for `{ roomId: Y1, userId: { $in: { X1, X2, X3} } }`
 *
 * A similar transform is possible if all the userIds are equal.
 *
 * While it's possible to break the query into more sets, there is a cpu cost
 * associated with doing this, so only the trivial case is attempted.
 *
 */
// eslint-disable-next-line complexity
function conjunctionIds(terms, termIdentifiers) {
  if (!terms.length) return { $or: terms };
  if (terms.length < 3) return { $or: terms };

  if (termIdentifiers.length !== 2) return { $or: terms };

  var t1Identifier = termIdentifiers[0];
  var t2Identifier = termIdentifiers[1];

  var t1CommonValue = terms[0][t1Identifier];
  var t1Common = true;
  var t2CommonValue = terms[0][t2Identifier];
  var t2Common = true;

  for (var i = 1; i < terms.length; i++) {
    var t1 = terms[i][t1Identifier];
    var t2 = terms[i][t2Identifier];

    if (t1CommonValue != t1) t1Common = false;
    if (t2CommonValue != t2) t2Common = false;

    if (!t1Common && !t2Common) break;
  }

  // Everything is the same. Just return the first term
  if (t1Common && t2Common) return terms[0];

  // If the first term is common for all conjunction terms...
  if (t1Common) {
    var t1CommonQuery = {};
    t1CommonQuery[t1Identifier] = t1CommonValue;

    var t2MultiQuery = {};
    t2MultiQuery[t2Identifier] = {
      $in: _.map(terms, function(term) {
        return term[t2Identifier];
      })
    };

    return { $and: [t1CommonQuery, t2MultiQuery] };
  }

  // If the second term is common for all conjunction terms...
  if (t2Common) {
    var t2CommonQuery = {};
    t2CommonQuery[t2Identifier] = t2CommonValue;

    var t1MultiQuery = {};
    t1MultiQuery[t1Identifier] = {
      $in: _.map(terms, function(term) {
        return term[t1Identifier];
      })
    };

    return { $and: [t2CommonQuery, t1MultiQuery] };
  }

  return { $or: terms };
}

function isMongoError(err) {
  // instanceof is not suitable since there may be multiple instances of
  // mongo driver loaded
  return err && err instanceof Error && err.name === 'MongoError';
}

function mongoErrorWithCode(code) {
  return function(err) {
    return isMongoError(err) && err.code === code;
  };
}

/**
 * Given an array of an array of models, return a
 * unique list of models
 */
function unionModelsById(arrayOfModels) {
  var idHash = {};

  return _.reduce(
    arrayOfModels,
    function(result, models) {
      if (!models) return result;

      return _.reduce(
        models,
        function(result, model) {
          var id = model.id || model._id;

          // Already added? Then skip it
          if (idHash[id]) return result;

          // Add to the hash and push to the result
          idHash[id] = true;
          result.push(model);
          return result;
        },
        result
      );
    },
    []
  );
}

module.exports = {
  objectIDsEqual: objectIDsEqual,
  isMongoError: isMongoError,
  setId: setId,
  setIds: setIds,
  isLikeObjectId: isLikeObjectId,
  asObjectID: asObjectID,
  asObjectIDs: asObjectIDs,
  getDateFromObjectId: getDateFromObjectId,
  getTimestampFromObjectId: getTimestampFromObjectId,
  getNewObjectIdString: getNewObjectIdString,
  serializeObjectId: serializeObjectId,
  serializeObjectIds: serializeObjectIds,
  createIdForTimestamp: createIdForTimestamp,
  createIdForTimestampString: createIdForTimestampString,
  createTestIdForTimestampString: createTestIdForTimestampString,
  fieldInPredicate: fieldInPredicate,
  conjunctionIds: conjunctionIds,
  mongoErrorWithCode: mongoErrorWithCode,
  unionModelsById: unionModelsById
};
