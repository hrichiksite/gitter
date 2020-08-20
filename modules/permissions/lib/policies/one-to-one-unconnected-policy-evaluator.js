'use strict';

var Promise = require('bluebird');

function OneToOneUnconnectionPolicyEvalator(user, toUser) {
  this._isValid = user.isActive() && toUser.isActive();
}

OneToOneUnconnectionPolicyEvalator.prototype = {
  canRead: function() {
    return Promise.resolve(false);
  },

  canWrite: function() {
    return Promise.resolve(false);
  },

  canJoin: function() {
    return Promise.resolve(this._isValid);
  },

  canAdmin: function() {
    return Promise.resolve(false);
  },

  canAddUser: function() {
    return Promise.resolve(false);
  }
};

module.exports = OneToOneUnconnectionPolicyEvalator;
