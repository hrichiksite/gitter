'use strict';

var assert = require('assert');
var GroupPolicyDelegate = require('./policies/group-policy-delegate');
const GlGroupPolicyDelegate = require('./policies/gl-group-policy-delegate');
const GlProjectPolicyDelegate = require('./policies/gl-project-policy-delegate');
const GlUserPolicyDelegate = require('./policies/gl-user-policy-delegate');
var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var GhUserPolicyDelegate = require('./policies/gh-user-policy-delegate');
var StatusError = require('statuserror');

function policyDelegateFactory(userId, userLoader, securityDescriptor) {
  assert(userLoader, 'userLoader required');
  assert(securityDescriptor, 'securityDescriptor required');

  switch (securityDescriptor.type) {
    case 'GROUP':
      return new GroupPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GL_GROUP':
      return new GlGroupPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GL_PROJECT':
      return new GlProjectPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GL_USER':
      return new GlUserPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_REPO':
      return new GhRepoPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_ORG':
      return new GhOrgPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_USER':
      return new GhUserPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'ONE_TO_ONE':
      throw new StatusError(500, 'policy-delegate-factory does not support one-to-one types');

    default:
      return null;
  }
}

module.exports = policyDelegateFactory;
