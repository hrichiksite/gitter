'use strict';

module.exports = (function() {
  function natural(a, b) {
    if (a === b) return 0;
    return a > b ? 1 : -1;
  }

  function idTransform(value) {
    return value && value.id;
  }

  function identityTransform(value) {
    return value;
  }

  return {
    naturalComparator: natural,
    identityTransform: identityTransform,
    idTransform: idTransform,

    /* Index an array into a hash */
    index: function(array, transformer) {
      if (!transformer) transformer = idTransform;

      var result = {};
      for (var i = 0; i < array.length; i++) {
        var item = array[i];
        var key = transformer(item);
        if (result[key]) {
          result[key].push(item);
        } else {
          result[key] = [item];
        }
      }

      return result;
    },

    /* Returns a date with no time part */
    extractDateFromDateTime: function(dateTime) {
      if (!dateTime) return null;
      return new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate());
    },

    extractTimeFromDateTime: function(dateTime) {
      if (!dateTime) return null;
      var time = dateTime.getHours() + ':' + dateTime.getMinutes();
      return time;
    },

    formatDate: function(dateTime) {
      if (!dateTime) return '';
      return dateTime.toLocaleDateString();
    },

    /* Max using a comparator. Underscore's max doesn't support comparators */
    max: function(array, comparator) {
      if (!comparator) comparator = natural;
      var max = array[0];
      for (var i = 1; i < array.length; i++) {
        var item = array[i];
        if (comparator(item, max) > 0) {
          max = item;
        }
      }
      return max;
    },

    /* Min using a comparator. Underscore's min doesn't support comparators */
    min: function(array, comparator) {
      if (!comparator) comparator = natural;

      var min = array[0];
      for (var i = 1; i < array.length; i++) {
        var item = array[i];
        if (comparator(min, item) > 0) {
          min = item;
        }
      }
      return min;
    }
  };
})();
