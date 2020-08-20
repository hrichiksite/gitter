'use strict';

var loadTroupeFromParam = require('./load-troupe-param');
var SecurityResourceRoute = require('../common/create-security-resource');
var sdWithPolicyFactory = require('../../../services/security-descriptor-with-policy-service');

module.exports = new SecurityResourceRoute({
  id: 'roomSecurity',
  getSecurityDescriptorWithPolicyService: function(req) {
    return loadTroupeFromParam(req).then(function(troupe) {
      return sdWithPolicyFactory.createForRoom(troupe, req.userRoomPolicy);
    });
  },
  subresourcesRoot: {
    extraAdmins: require('./security-extra-admins')
  }
});
