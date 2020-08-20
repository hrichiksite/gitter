'use strict';

var Promise = require('bluebird');
var TroupeUriStrategy = require('./troupe-uri-strategy');
var billingService = require('../../services/billing-service');

function OrgPlanStrategy() {
  var orgsWithPlans;

  this.preload = function(orgUris) {
    if (orgUris.isEmpty()) return;

    return billingService.findActiveOrgPlans(orgUris.toArray()).then(function(subscriptions) {
      orgsWithPlans = subscriptions.reduce(function(memo, s) {
        memo[s.uri.toLowerCase()] = s.plan;
        return memo;
      }, {});

      return true;
    });
  };

  this.map = function(orgUri) {
    return orgsWithPlans[orgUri.toLowerCase()];
  };
}

OrgPlanStrategy.prototype = {
  name: 'OrgPlanStrategy'
};

function GitHubOrgStrategy(options) {
  var troupeUriStrategy = new TroupeUriStrategy(options);
  var planStrategy = new OrgPlanStrategy();

  this.preload = function(orgs) {
    var orgUris = orgs.map(function(org) {
      return org.login;
    });

    return Promise.join(troupeUriStrategy.preload(orgUris), planStrategy.preload(orgUris));
  };

  this.map = function(item) {
    var plan = planStrategy.map(item.login);
    return {
      type: 'GH_ORG',
      id: item.id,
      name: item.login,
      avatar_url: item.avatar_url,
      uri: item.login,
      absoluteUri: item.absoluteUri,
      room: troupeUriStrategy.map(item.login),
      premium: !!plan
    };
  };
}

GitHubOrgStrategy.prototype = {
  name: 'GithubOrgStrategy'
};

module.exports = GitHubOrgStrategy;
