'use strict';

var restSerializer = require('../../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var StatusError = require('statuserror');

function SecurityResourceRoute(options) {
  this.id = options.id;
  this.subresources = options.subresources;
  this.subresourcesRoot = options.subresourcesRoot;

  this.getSecurityDescriptorWithPolicyService = options.getSecurityDescriptorWithPolicyService;
}

SecurityResourceRoute.prototype.index = function(req) {
  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      return sdService.get();
    })
    .then(function(securityDescriptor) {
      var strategy = restSerializer.SecurityDescriptorStrategy.full();
      return restSerializer.serializeObject(securityDescriptor, strategy);
    });
};

SecurityResourceRoute.prototype.updateRoot = function(req) {
  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      var type = req.body.type;
      var extraAdmins = req.body.extraAdmins;
      if (extraAdmins) {
        if (!Array.isArray(extraAdmins)) {
          throw new StatusError(400, 'extraAdmins must be an array');
        }

        if (
          !extraAdmins.every(function(id) {
            return mongoUtils.isLikeObjectId(id);
          })
        ) {
          throw new StatusError(400, 'extraAdmins must be user identifiers');
        }
      }
      return sdService.update({
        type: type,
        extraAdmins: extraAdmins
      });
    })
    .then(function(securityDescriptor) {
      var strategy = restSerializer.SecurityDescriptorStrategy.full();
      return restSerializer.serializeObject(securityDescriptor, strategy);
    });
};

module.exports = SecurityResourceRoute;
