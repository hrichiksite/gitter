'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');

function iterateValidators(validators, context, args) {
  if (typeof validators === 'function') {
    return Promise.try(function() {
      return validators.apply(context, args);
    });
  }

  if (!validators.length) return Promise.resolve(false);

  if (validators.length === 1) {
    return Promise.try(function() {
      return validators[0].apply(context, args);
    });
  }

  return (function iteratorValidators(position) {
    if (position >= validators.length) {
      return false;
    }

    var validator = validators[position];
    return Promise.resolve(validator.apply(context, args)).then(function(access) {
      if (access) return true;
      return iteratorValidators(position + 1);
    });
  })(0);
}

function execSecurityValidators(context, validators, fn, args) {
  return iterateValidators(validators, context, args).then(function(access) {
    if (!access) throw new StatusError(403);
    return fn.apply(context, args);
  });
}

function secureMethod(validators, fn) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var self = this;
    return Promise.try(function() {
      return execSecurityValidators(self, validators, fn, args);
    });
  };
}

module.exports = secureMethod;
