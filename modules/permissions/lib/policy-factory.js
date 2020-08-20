'use strict';

var Promise = require('bluebird');
const createBasePolicy = require('./policies/create-base-policy');
var StaticPolicyEvaluator = require('./policies/static-policy-evaluator');
var OneToOnePolicyEvaluator = require('./policies/one-to-one-policy-evaluator');
var OneToOneUnconnectionPolicyEvalator = require('./policies/one-to-one-unconnected-policy-evaluator');
var RoomContextDelegate = require('./context-delegates/room-context-delegate');
var OneToOneContextDelegate = require('./context-delegates/one-to-one-room-context-delegate');
var StatusError = require('statuserror');
var securityDescriptorService = require('./security-descriptor');
const PreCreationGitlabGroupPolicyEvaluator = require('./pre-creation/gl-group-policy-evaluator');
const PreCreationGitlabProjectPolicyEvaluator = require('./pre-creation/gl-project-policy-evaluator');
const PreCreationGitlabUserPolicyEvaluator = require('./pre-creation/gl-user-policy-evaluator');
var PreCreationGhRepoPolicyEvaluator = require('./pre-creation/gh-repo-policy-evaluator');
var PreCreationGhOrgPolicyEvaluator = require('./pre-creation/gh-org-policy-evaluator');
var PreCreationGhUserPolicyEvaluator = require('./pre-creation/gh-user-policy-evaluator');
var FallbackPolicyEvaluator = require('./pre-creation/fallback-policy-evaluator');
var policyDelegateFactory = require('./policy-delegate-factory');
var userLoaderFactory = require('./user-loader-factory');

function getPolicyDelegate(userId, user, securityDescriptor) {
  var userLoader = userLoaderFactory(userId, user);
  return policyDelegateFactory(userId, userLoader, securityDescriptor);
}

function createPolicyFromDescriptor(userId, user, securityDescriptor, roomId) {
  if (securityDescriptor.type === 'ONE_TO_ONE') {
    if (!userId) {
      // Anonymous users can never join a one-to-one
      return new StaticPolicyEvaluator(false);
    }

    var oneToOneContextDelegate = new OneToOneContextDelegate(userId, roomId);
    return new OneToOnePolicyEvaluator(userId, securityDescriptor, oneToOneContextDelegate);
  }

  var policyDelegate = getPolicyDelegate(userId, user, securityDescriptor);
  var contextDelegate;
  if (userId) {
    // No point in providing a context delegate for an anonymous user
    contextDelegate = new RoomContextDelegate(userId, roomId);
  }

  return createBasePolicy(userId, user, securityDescriptor, policyDelegate, contextDelegate);
}

function createPolicyForRoomId(user, roomId) {
  var userId = user && user._id;

  return securityDescriptorService.room.findById(roomId, userId).then(function(securityDescriptor) {
    if (!securityDescriptor) throw new StatusError(404);

    return createPolicyFromDescriptor(userId, user, securityDescriptor, roomId);
  });
}

function createPolicyForRoom(user, room) {
  var roomId = room._id;
  var userId = user && user._id;

  // TODO: optimise this as we may already have the information we need on the room...
  // in which case we shouldn't have to refetch it from mongo
  return securityDescriptorService.room.findById(roomId, userId).then(function(securityDescriptor) {
    if (!securityDescriptor) throw new StatusError(404);

    return createPolicyFromDescriptor(userId, user, securityDescriptor, roomId);
  });
}

function createPolicyForGroupId(user, groupId) {
  var userId = user && user._id;

  return securityDescriptorService.group
    .findById(groupId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      var policyDelegate = getPolicyDelegate(userId, user, securityDescriptor);
      var contextDelegate = null; // No group context yet

      return createBasePolicy(userId, user, securityDescriptor, policyDelegate, contextDelegate);
    });
}

function createPolicyForGroupIdWithUserLoader(userId, userLoader, groupId) {
  return securityDescriptorService.group
    .findById(groupId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      var policyDelegate = policyDelegateFactory(userId, userLoader, securityDescriptor);
      var contextDelegate = null; // No group context yet

      return createBasePolicy(userId, null, securityDescriptor, policyDelegate, contextDelegate);
    });
}

function createPolicyForUserIdInRoomId(userId, roomId) {
  return securityDescriptorService.room.findById(roomId, userId).then(function(securityDescriptor) {
    if (!securityDescriptor) throw new StatusError(404);

    return createPolicyFromDescriptor(userId, null, securityDescriptor, roomId);
  });
}

function createPolicyForUserIdInRoom(userId, room) {
  var roomId = room._id;

  return securityDescriptorService.room.findById(roomId, userId).then(function(securityDescriptor) {
    if (!securityDescriptor) throw new StatusError(404);

    return createPolicyFromDescriptor(userId, null, securityDescriptor, roomId);
  });
}

function createPolicyForOneToOne(user, toUser) {
  return new OneToOneUnconnectionPolicyEvalator(user, toUser);
}

/**
 * Pre-creation Policy Evaluator factory
 */
function getPreCreationPolicyEvaluator(user, type, uri) {
  switch (type) {
    case 'GL_GROUP':
      return new PreCreationGitlabGroupPolicyEvaluator(user, uri);

    case 'GL_PROJECT':
      return new PreCreationGitlabProjectPolicyEvaluator(user, uri);

    case 'GL_USER':
      return new PreCreationGitlabUserPolicyEvaluator(user, uri);

    case 'GH_ORG':
      return new PreCreationGhOrgPolicyEvaluator(user, uri);

    case 'GH_REPO':
      return new PreCreationGhRepoPolicyEvaluator(user, uri);

    case 'GH_USER':
      return new PreCreationGhUserPolicyEvaluator(user, uri);

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }
}

function getPreCreationPolicyEvaluatorWithRepoFallback(user, type, uri, fallbackRepoUri) {
  var primary = getPreCreationPolicyEvaluator(user, type, uri);
  if (!fallbackRepoUri) {
    return primary;
  }

  // Use a fallback policy evaluator

  // TODO: Should we be checking here that the repo is under the primary?
  var secondary = new PreCreationGhRepoPolicyEvaluator(user, fallbackRepoUri);
  return new FallbackPolicyEvaluator(primary, secondary);
}

module.exports = {
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyForRoom: Promise.method(createPolicyForRoom),
  createPolicyForGroupId: Promise.method(createPolicyForGroupId),
  createPolicyForGroupIdWithUserLoader: Promise.method(createPolicyForGroupIdWithUserLoader),
  createPolicyForUserIdInRoomId: Promise.method(createPolicyForUserIdInRoomId),
  createPolicyForUserIdInRoom: Promise.method(createPolicyForUserIdInRoom),
  createPolicyForOneToOne: Promise.method(createPolicyForOneToOne),

  // For things that have not yet been created
  getPreCreationPolicyEvaluator: getPreCreationPolicyEvaluator,
  getPreCreationPolicyEvaluatorWithRepoFallback: getPreCreationPolicyEvaluatorWithRepoFallback
};
