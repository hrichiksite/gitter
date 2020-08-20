'use strict';

var SecurityResourceRoute = require('../common/create-security-resource');
var sdWithPolicyFactory = require('../../../services/security-descriptor-with-policy-service');
var Promise = require('bluebird');

module.exports = new SecurityResourceRoute({
  id: 'groupSecurity',
  getSecurityDescriptorWithPolicyService: function(req) {
    return Promise.resolve(sdWithPolicyFactory.createForGroup(req.group, req.userGroupPolicy));
  },
  subresourcesRoot: {
    extraAdmins: require('./security-extra-admins')
  }
});
