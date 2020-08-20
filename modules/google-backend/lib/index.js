'use strict';

function GoogleBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GoogleBackend.prototype.getEmailAddress = function() {
  return this.identity.email;
};

GoogleBackend.prototype.findOrgs = function() {
  return [];
};

GoogleBackend.prototype.getProfile = function() {
  // TODO: gravatar or fullcontact?
  return { provider: 'google' };
};

module.exports = GoogleBackend;
