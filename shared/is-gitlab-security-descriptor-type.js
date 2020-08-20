'use strict';

function isGitlabSecurityDescriptorType(type) {
  return type === 'GL_GROUP' || type === 'GL_PROJECT' || type === 'GL_USER';
}

module.exports = isGitlabSecurityDescriptorType;
