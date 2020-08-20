'use strict';

function SimpleSecurityDescriptorStrategy() {}

SimpleSecurityDescriptorStrategy.prototype = {
  preload: function() {
    return;
  },

  map: function(sd) {
    if (!sd) return;
    if (sd.type === 'ONE_TO_ONE') return;

    return {
      type: sd.type || null,
      linkPath: sd.linkPath || undefined
    };
  },

  name: 'SimpleSecurityDescriptorStrategy'
};

function FullSecurityDescriptorStrategy() {}

FullSecurityDescriptorStrategy.prototype = {
  preload: function() {
    return;
  },

  map: function(sd) {
    if (!sd) return;
    if (sd.type === 'ONE_TO_ONE') return;

    return {
      type: sd.type || null,
      linkPath: sd.linkPath || undefined,
      admins: sd.admins || undefined,
      members: sd.members || undefined
    };
  },

  name: 'FullSecurityDescriptorStrategy'
};

function slim() {
  return new SimpleSecurityDescriptorStrategy();
}

function full() {
  return new FullSecurityDescriptorStrategy();
}

module.exports = {
  full: full,
  slim: slim
};
