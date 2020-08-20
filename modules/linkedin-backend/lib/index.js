'use strict';

function LinkedInBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

LinkedInBackend.prototype.getEmailAddress = function(/*preferStoredEmail*/) {
  return this.identity.email;
};

LinkedInBackend.prototype.findOrgs = function() {
  return [];
};

LinkedInBackend.prototype.getProfile = function() {
  // TODO: gravatar or fullcontact?
  return { provider: 'linkedin' };
};

module.exports = LinkedInBackend;
