'use strict';

var Promise = require('bluebird');
var policyDelegateFactory = require('./policy-delegate-factory');
var createBasePolicy = require('./policies/create-base-policy');
var userLoaderFactory = require('./user-loader-factory');

/**
 * When testing n > MAX_FILTER_CONCURRENCY items, this is the
 * maximum concurrency we'll use
 */
var MAX_FILTER_CONCURRENCY = 32;

function securityDescriptorAdminFilter(user, objectsWithSecurityDescriptors) {
  if (!user || !objectsWithSecurityDescriptors.length) return [];
  var userLoader = userLoaderFactory(user._id, user);

  return Promise.map(
    objectsWithSecurityDescriptors,
    function(objectsWithSecurityDescriptor) {
      var securityDescriptor = objectsWithSecurityDescriptor.sd;

      var policyDelegate = policyDelegateFactory(user._id, userLoader, securityDescriptor);
      var contextDelegate = null; // No context delegate needed for admin

      const basePolicy = createBasePolicy(
        user._id,
        user,
        securityDescriptor,
        policyDelegate,
        contextDelegate
      );

      return basePolicy.canAdmin().then(function(admin) {
        if (admin) return objectsWithSecurityDescriptor;
      });
    },
    {
      concurrency: MAX_FILTER_CONCURRENCY
    }
  ).then(function(adminSecurityDescriptors) {
    return adminSecurityDescriptors.filter(Boolean);
  });
}

module.exports = Promise.method(securityDescriptorAdminFilter);
