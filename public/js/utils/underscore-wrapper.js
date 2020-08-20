/* eslint complexity: ["error", 31], max-depth: ["error", 5] */
'use strict';

/* This require looks HORRIBLE, but it's a way to use the non-aliased underscore */
/* Webpack config will alias all usages of underscore to this module */
/* we've globally replaced underscore with lodash v3 */
var _ = require('../../../node_modules/lodash');

var ObjProto = Object.prototype;
var toString = ObjProto.toString;
var objValueOf = ObjProto.valueOf;

function customValueOfFunction(f) {
  return _.isFunction(f) && f !== objValueOf;
}

// Internal recursive comparison function for `isEqual`.
// eslint-disable-next-line complexity, max-statements
function eq(a, b, aStack, bStack) {
  // Identical objects are equal. `0 === -0`, but they aren't identical.
  // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  // A strict comparison is necessary because `null == undefined`.
  if (a == null || b == null) return a === b;

  // Unwrap any wrapped objects.
  if (a instanceof _) a = a._wrapped;
  if (b instanceof _) b = b._wrapped;

  // Compare `[[Class]]` names.
  var className = toString.call(a);
  if (className !== toString.call(b)) return false;
  switch (className) {
    // RegExps are coerced to strings for comparison.
    case '[object RegExp]': // Strings, numbers, dates, and booleans are compared by value.
    case '[object String]':
      // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
      // equivalent to `String("5")`.
      return '' + a === '' + b;
    case '[object Number]':
      // `NaN`s are equivalent, but non-reflexive.
      if (a != +a) return b != +b;
      // An `egal` comparison is performed for other numeric values.
      return a == 0 ? 1 / a == 1 / b : a == +b;
    case '[object Date]':
    case '[object Boolean]':
      // Coerce dates and booleans to numeric primitive values. Dates are compared by their
      // millisecond representations. Note that invalid dates with millisecond representations
      // of `NaN` are not equivalent.
      return +a === +b;
  }

  if (typeof a !== 'object' || typeof b !== 'object') return false;
  // Assume equality for cyclic structures. The algorithm for detecting cyclic
  // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
  var length = aStack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    if (aStack[length] === a) return bStack[length] === b;
  }
  // Objects with different constructors are not equivalent, but `Object`s
  // from different frames are.
  var aCtor = a.constructor,
    bCtor = b.constructor;
  if (
    aCtor !== bCtor &&
    'constructor' in a &&
    'constructor' in b &&
    !(
      _.isFunction(aCtor) &&
      aCtor instanceof aCtor &&
      _.isFunction(bCtor) &&
      bCtor instanceof bCtor
    )
  ) {
    return false;
  }
  // Add the first object to the stack of traversed objects.
  aStack.push(a);
  bStack.push(b);
  var size = 0,
    result = true;
  // Recursively compare objects and arrays.
  if (className === '[object Array]') {
    // Compare array lengths to determine if a deep comparison is necessary.
    size = a.length;
    result = size === b.length;
    if (result) {
      // Deep compare the contents, ignoring non-numeric properties.
      while (size--) {
        if (!(result = eq(a[size], b[size], aStack, bStack))) break;
      }
    }
  } else {
    if (customValueOfFunction(a.valueOf) && customValueOfFunction(b.valueOf)) {
      var vA = a.valueOf();
      var vB = b.valueOf();

      result = eq(vA, vB, aStack, bStack);
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !size--) break;
        }
        result = !size;
      }
    }
  }
  // Remove the first object from the stack of traversed objects.
  aStack.pop();
  bStack.pop();
  return result;
}

// Perform a deep comparison to check if two objects are equal.
_.isEqual = function(a, b) {
  return eq(a, b, [], []);
};

module.exports = _;
