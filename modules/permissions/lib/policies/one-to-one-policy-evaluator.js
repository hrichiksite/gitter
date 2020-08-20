'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:app:permissions:one-to-one-policy-evaluator');

function OneToOnePolicyEvaluator(userId, securityDescriptor, contextDelegate) {
  this._userId = userId;
  this._contextDelegate = contextDelegate;
}

OneToOnePolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    if (!this._userId) {
      debug('canRead: Denying anonymous user');
      return false;
    }

    if (!this._contextDelegate) {
      debug('canRead: Denying user without context');
      return false;
    }

    return this._contextDelegate.isMember();
  }),

  canWrite: function() {
    return this.canRead();
  },

  canJoin: function() {
    return this.canRead();
  },

  canAdmin: function() {
    return Promise.resolve(false);
  },

  canAddUser: function() {
    return Promise.resolve(false);
  }
};

module.exports = OneToOnePolicyEvaluator;
