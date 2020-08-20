'use strict';

function TwitterBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

TwitterBackend.prototype.getEmailAddress = function(/*preferStoredEmail*/) {
  return this.identity.email;
};

TwitterBackend.prototype.findOrgs = function() {
  return [];
};

TwitterBackend.prototype.getProfile = function() {
  return { provider: 'twitter' };
};

module.exports = TwitterBackend;
