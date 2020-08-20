'use strict';

function FallbackPolicyEvaluator(primary, secondary) {
  this.primary = primary;
  this.secondary = secondary;
}

FallbackPolicyEvaluator.prototype = {
  canRead: function() {
    return this.primary.canRead().then(access => {
      if (access) return true;
      return this.secondary.canRead();
    });
  },

  canWrite: function() {
    return this.primary.canWrite().then(access => {
      if (access) return true;
      return this.secondary.canWrite();
    });
  },

  canJoin: function() {
    return this.primary.canJoin().then(access => {
      if (access) return true;
      return this.secondary.canJoin();
    });
  },

  canAdmin: function() {
    return this.primary.canAdmin().then(access => {
      if (access) return true;
      return this.secondary.canAdmin();
    });
  },

  canAddUser: function() {
    return this.primary.canAddUser().then(access => {
      if (access) return true;
      return this.secondary.canAddUser();
    });
  }
};

module.exports = FallbackPolicyEvaluator;
