'use strict';

var troupeService = require('gitter-web-rooms/lib/troupe-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');

module.exports = function(req, res, next) {
  var uri = '' + req.body.uri;
  var user = req.user;

  return troupeService
    .findByUri(uri)
    .bind({
      troupe: null
    })
    .then(function(troupe) {
      this.troupe = troupe;
      return policyFactory.createPolicyForRoom(user, troupe);
    })
    .then(function(policy) {
      var roomWithPolicyService = new RoomWithPolicyService(this.troupe, req.user, policy);
      return roomWithPolicyService.sendBadgePullRequest();
    })
    .then(function() {
      res.send({ success: true });
    })
    .catch(next);
};
