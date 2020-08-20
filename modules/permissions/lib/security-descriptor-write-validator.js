'use strict';

var StatusError = require('statuserror');
var securityDescriptorValidator = require('./security-descriptor-validator');

function hasZeroExtraAdmins(descriptor) {
  if (!descriptor) return true;
  if (!descriptor.extraAdmins) return true;
  if (!Array.isArray(descriptor.extraAdmins)) return true;
  if (!descriptor.extraAdmins.length) return true;
  return false;
}

function validate(descriptor) {
  securityDescriptorValidator(descriptor);

  if (descriptor.admins === 'MANUAL') {
    if (hasZeroExtraAdmins(descriptor)) {
      throw new StatusError(400, 'Manually configured groups must have at least one extraAdmin');
    }
  }
}

module.exports = validate;
