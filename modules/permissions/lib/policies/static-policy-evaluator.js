'use strict';

var Promise = require('bluebird');

function StaticPolicyEvaluator(response) {
  this._response = response;
}

StaticPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    return this._response;
  }),

  canWrite: Promise.method(function() {
    return this._response;
  }),

  canJoin: Promise.method(function() {
    return this._response;
  }),

  canAdmin: Promise.method(function() {
    return this._response;
  }),

  canAddUser: Promise.method(function() {
    return this._response;
  })
};

module.exports = StaticPolicyEvaluator;
