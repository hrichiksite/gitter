'use strict';

var Backbone = require('backbone');
var requestingSecurityDescriptorStatusConstants = require('../views/modals/permissions/requesting-security-descriptor-status-constants');
var SyncMixin = require('../collections/sync-mixin');

var PermissionsViewModel = Backbone.Model.extend({
  defaults: {
    entity: null,
    initialSecurityDescriptorType: undefined,
    securityDescriptor: {
      type: undefined,
      linkPath: undefined,
      public: undefined,
      externalId: undefined,
      internalId: undefined
      //extraAdmins: see `adminCollection`
      //extraMembers: NA
    },
    requestingSecurityDescriptorStatus: null,
    submitSecurityDescriptorStatus: null
  },

  initialize: function(attrs, options) {
    options = options || {};

    this.groupCollection = options.groupCollection || new Backbone.Collection([]);
    this.adminCollection = new Backbone.Collection(
      options.adminCollection ? options.adminCollection.models : []
    );
    this.adminCollection.sync = SyncMixin.sync;
  },

  validate: function() {
    var errors = [];

    var sd = this.get('securityDescriptor');
    var requestingSecurityDescriptorStatus = this.get('requestingSecurityDescriptorStatus');

    if (sd && !sd.type && this.adminCollection.length === 0) {
      errors.push({
        key: 'extra-admins',
        message: 'At least one admin needs to be added when manual type set.'
      });
    }

    // If the original SD hasn't been spliced into our data, then it's a no-go
    if (
      requestingSecurityDescriptorStatus !== requestingSecurityDescriptorStatusConstants.COMPLETE
    ) {
      errors.push({
        key: 'security-descriptor',
        message: 'Security descriptor needs to sync before submission.'
      });
    }

    return errors.length > 0 ? errors : undefined;
  }
});

module.exports = PermissionsViewModel;
