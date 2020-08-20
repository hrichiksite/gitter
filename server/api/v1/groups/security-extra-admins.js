'use strict';

var SecurityResourceExtraAdminsRoute = require('../common/create-security-extra-admins-resource');
var sdWithPolicyFactory = require('../../../services/security-descriptor-with-policy-service');
var Promise = require('bluebird');

module.exports = new SecurityResourceExtraAdminsRoute({
  id: 'groupSecurityExtraAdmin',
  getSecurityDescriptorWithPolicyService: function(req) {
    return Promise.resolve(sdWithPolicyFactory.createForGroup(req.group, req.userGroupPolicy));
  }
});
