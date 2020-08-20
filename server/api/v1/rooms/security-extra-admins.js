'use strict';

var loadTroupeFromParam = require('./load-troupe-param');
var SecurityResourceExtraAdminsRoute = require('../common/create-security-extra-admins-resource');
var sdWithPolicyFactory = require('../../../services/security-descriptor-with-policy-service');

module.exports = new SecurityResourceExtraAdminsRoute({
  id: 'roomSecurityExtraAdmin',
  getSecurityDescriptorWithPolicyService: function(req) {
    return loadTroupeFromParam(req).then(function(troupe) {
      return sdWithPolicyFactory.createForRoom(troupe, req.userRoomPolicy);
    });
  }
});
