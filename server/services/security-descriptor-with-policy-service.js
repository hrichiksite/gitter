'use strict';

var secureMethod = require('gitter-web-utils/lib/secure-method');
var assert = require('assert');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor');

/**
 * This could do with a better name
 */
function SecurityDescriptorWithPolicy(securityDescriptorService, id, sd, policy, ownerGroupId) {
  assert(id, 'id required');
  assert(sd, 'sd required');
  assert(policy, 'Policy required');
  this.securityDescriptorService = securityDescriptorService;
  this.id = id;
  this.ownerGroupId = ownerGroupId;
  this.policy = policy;
  this.sd = sd;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

SecurityDescriptorWithPolicy.prototype.get = secureMethod([allowAdmin], function() {
  return this.sd;
});

SecurityDescriptorWithPolicy.prototype.addExtraAdmin = secureMethod([allowAdmin], function(userId) {
  return this.securityDescriptorService.addExtraAdmin(this.id, userId);
});

SecurityDescriptorWithPolicy.prototype.removeExtraAdmin = secureMethod([allowAdmin], function(
  userId
) {
  return this.securityDescriptorService.removeExtraAdmin(this.id, userId);
});

SecurityDescriptorWithPolicy.prototype.listExtraAdmins = secureMethod([allowAdmin], function() {
  return this.securityDescriptorService.findExtraAdmins(this.id);
});

SecurityDescriptorWithPolicy.prototype.update = secureMethod([allowAdmin], function(update) {
  return this.securityDescriptorService.update(this.id, update, {
    groupId: this.ownerGroupId
  });
});

function createForGroup(group, policy) {
  return new SecurityDescriptorWithPolicy(
    securityDescriptorService.group,
    group._id,
    group.sd,
    policy,
    null
  );
}

function createForRoom(room, policy) {
  return new SecurityDescriptorWithPolicy(
    securityDescriptorService.room,
    room._id,
    room.sd,
    policy,
    room.groupId
  );
}

module.exports = {
  createForGroup: createForGroup,
  createForRoom: createForRoom
};
