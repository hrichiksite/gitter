'use strict';

var logger = require('gitter-web-env').logger;
var userService = require('gitter-web-users');
var Promise = require('bluebird');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');

/**
 * Returns the permissions the user has in the orgs.
 * This is not intended to be used for large sets, rather individual items
 */
function TroupePermissionsStrategy(options) {
  this.currentUser = options.currentUser;
  this.currentUserId = options.currentUserId;
  this.isAdmin = null;
}

TroupePermissionsStrategy.prototype = {
  preload: function(troupes) {
    if (troupes.isEmpty()) return;

    var currentUser = this.currentUser;
    var currentUserId = this.currentUserId;

    return Promise.try(function() {
      if (currentUser) {
        return currentUser;
      }

      if (currentUserId) {
        return userService.findById(currentUserId);
      }
    })
      .bind(this)
      .then(function(user) {
        // setup this.isAdmin _before_ possibly returning, otherwise map will npe
        var isAdmin = (this.isAdmin = {});

        if (!user) return;

        return Promise.map(troupes.toArray(), function(troupe) {
          return policyFactory
            .createPolicyForRoom(user, troupe)
            .then(function(policy) {
              return policy.canAdmin();
            })
            .then(function(admin) {
              isAdmin[troupe.id] = admin;
            })
            .catch(function(err) {
              // Fallback in case of GitHub API downtime
              logger.error('Unable to obtain admin permissions', { exception: err });
              isAdmin[troupe.id] = false;
            });
        });
      });
  },

  map: function(troupe) {
    return {
      admin: this.isAdmin[troupe.id] || false
    };
  },

  name: 'TroupePermissionsStrategy'
};

module.exports = TroupePermissionsStrategy;
