'use strict';

var Promise = require('bluebird');
var createBasePolicy = require('./policies/create-base-policy');
var RoomContextDelegate = require('./context-delegates/room-context-delegate');
var RoomInviteContextDelegate = require('./context-delegates/room-invite-context-delegate');
var DisjunctionContextDelegate = require('./context-delegates/disjunction-context-delegate');
var StaticContextDelegate = require('./context-delegates/static-context-delegate');
var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var GhUserPolicyDelegate = require('./policies/gh-user-policy-delegate');
const GlGroupPolicyDelegate = require('./policies/gl-group-policy-delegate');
const GlProjectPolicyDelegate = require('./policies/gl-project-policy-delegate');
const GlUserPolicyDelegate = require('./policies/gl-user-policy-delegate');
var StatusError = require('statuserror');
var securityDescriptorService = require('./security-descriptor');
var userLoaderFactory = require('./user-loader-factory');
var assert = require('assert');

/**
 * @private
 */
function getDelegateForSecurityDescriptor(userId, user, securityDescriptor) {
  var userLoader = userLoaderFactory(userId, user);

  switch (securityDescriptor.type) {
    case 'GH_REPO':
      return new GhRepoPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_ORG':
      return new GhOrgPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_USER':
      return new GhUserPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GL_GROUP':
      return new GlGroupPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GL_PROJECT':
      return new GlProjectPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GL_USER':
      return new GlUserPolicyDelegate(userId, userLoader, securityDescriptor);

    default:
      return null;
  }
}

/**
 * Creates a policy for invites:
 * Note: this code does not deal with the case where:
 * - Somebody is invited to join a room which they cannot ever join.
 * - For example: I invite a non-member to join a room which only allows GitHub org members.
 * In this case, the user will accept the invite and be rejected at that time.
 */
function createPolicyForRoomInvite(user, room, inviteSecret) {
  var roomId = room._id;
  var userId = user && user._id;

  // TODO: optimise this as we may already have the information we need on the room...
  // in which case we shouldn't have to refetch it from mongo
  return securityDescriptorService.room.findById(roomId, userId).then(function(securityDescriptor) {
    if (!securityDescriptor) throw new StatusError(404);

    if (securityDescriptor.type === 'ONE_TO_ONE') {
      // This shouldn't happen
      assert.ok(false, 'Invites for one-to-one rooms are not yet implemented');
    }

    var policyDelegate = getDelegateForSecurityDescriptor(userId, user, securityDescriptor);

    // Either the user is in the room already, or the secret matches
    var contextDelegate = new DisjunctionContextDelegate([
      new RoomContextDelegate(userId, roomId),
      new RoomInviteContextDelegate(userId, roomId, inviteSecret)
    ]);

    return createBasePolicy(userId, user, securityDescriptor, policyDelegate, contextDelegate);
  });
}

/**
 * Creates a policy for adding users to a room.
 * Note that if the user being added is unable to access the room because they
 * have the wrong access tokens (for example, it's a private room and they only
 * have public tokens) they will be rejected. This may be confusing to
 * the user who is trying to add the other user, since they won't really
 * understand why the user they're trying to add is being rejected. We could
 * probably add some extra help for this rare situation
 */
function createPolicyForRoomAdd(user, room) {
  var roomId = room._id;
  var userId = user && user._id;

  // TODO: optimise this as we may already have the information we need on the room...
  // in which case we shouldn't have to refetch it from mongo
  return securityDescriptorService.room.findById(roomId, userId).then(function(securityDescriptor) {
    if (!securityDescriptor) throw new StatusError(404);

    if (securityDescriptor.type === 'ONE_TO_ONE') {
      // This shouldn't happen
      assert.ok(false, 'Invites for one-to-one rooms are not yet implemented');
    }

    var policyDelegate = getDelegateForSecurityDescriptor(userId, user, securityDescriptor);

    // For 'add' we treat the user as already being in the room
    var contextDelegate = new StaticContextDelegate(true);

    return createBasePolicy(userId, user, securityDescriptor, policyDelegate, contextDelegate);
  });
}

module.exports = {
  createPolicyForRoomAdd: Promise.method(createPolicyForRoomAdd),
  createPolicyForRoomInvite: Promise.method(createPolicyForRoomInvite)
};
