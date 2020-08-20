'use strict';

var Promise = require('bluebird');

/**
 * OR-style context-delegate
 */
function DisjunctionContextDelegate(contextDelegates) {
  this.contextDelegates = contextDelegates;
}

DisjunctionContextDelegate.prototype = {
  isMember: function() {
    return Promise.map(this.contextDelegates, function(delegate) {
      return delegate.isMember();
    }).then(function(results) {
      // If any of the results are true, the result is true (OR)
      return results.some(function(result) {
        return !!result;
      });
    });
  },

  handleReadAccessFailure: Promise.method(function() {
    return Promise.map(this.contextDelegates, function(delegate) {
      return delegate.handleReadAccessFailure();
    });
  })
};

module.exports = DisjunctionContextDelegate;
