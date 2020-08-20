'use strict';

var billingService = require('../../../services/billing-service');

function getOwner(uri) {
  return uri.split('/', 1).shift();
}

function ProOrgStrategy() {
  this.proOrgs = null;
}

ProOrgStrategy.prototype = {
  preload: function(troupes) {
    var uris = troupes
      .map(function(troupe) {
        if (!troupe.uri) return; // one-to-one
        return getOwner(troupe.uri);
      })
      .filter(function(room) {
        return !!room; // this removes the `undefined` left behind (one-to-ones)
      })
      .uniq();

    return billingService
      .findActiveOrgPlans(uris.toArray())
      .bind(this)
      .then(function(subscriptions) {
        var proOrgs = {};
        subscriptions.forEach(function(subscription) {
          var uri = subscription.uri || '';
          proOrgs[uri.toLowerCase()] = !!subscription;
        });

        this.proOrgs = proOrgs;
      });
  },

  map: function(troupe) {
    if (!troupe || !troupe.uri) return undefined;

    var owner = getOwner(troupe.uri).toLowerCase();
    return this.proOrgs[owner];
  },

  name: 'ProOrgStrategy'
};

module.exports = ProOrgStrategy;
