'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('permissions');
var _ = require('lodash');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const userCanJoinRoom = require('gitter-web-shared/rooms/user-can-join-room');
const identityService = require('gitter-web-identity');
const userLoaderFactory = require('../user-loader-factory');
var policyCheckRateLimiter = require('./policy-check-rate-limiter');
var PolicyDelegateTransportError = require('./policy-delegate-transport-error');
var debug = require('debug')('gitter:app:permissions:policy-evaluator');
var assert = require('assert');
var knownAccessRecorder = require('../known-external-access/recorder');

var SUCCESS_RESULT_CACHE_TIME = 5 * 60; // 5 minutes in seconds

function bansIncludesUserId(bans, userId) {
  return _.some(bans, function(ban) {
    return mongoUtils.objectIDsEqual(userId, ban.userId);
  });
}

function containsUserId(collection, userId) {
  return _.some(collection, function(item) {
    return mongoUtils.objectIDsEqual(userId, item);
  });
}

function createBasePolicy(userId, user, securityDescriptor, policyDelegate, contextDelegate) {
  if (userId) {
    assert(mongoUtils.isLikeObjectId(userId), 'userId must be an ObjectID');
  }

  const _checkPolicyCacheResult = async function(policyName) {
    const access = await policyDelegate.hasPolicy(policyName);

    if (userId) {
      // Cache the access for admin user lookups
      const accessDetails = policyDelegate.getAccessDetails(policyName);
      if (accessDetails) {
        // This is not chained to the promise
        knownAccessRecorder(
          userId,
          accessDetails.type,
          policyName,
          accessDetails.linkPath,
          accessDetails.externalId,
          access
        );
      }
    }

    if (access) {
      // If successful, cache the result for a short period
      const rateLimitKey = policyDelegate.getPolicyRateLimitKey(policyName);

      if (rateLimitKey) {
        policyCheckRateLimiter.recordSuccessfulCheck(rateLimitKey, SUCCESS_RESULT_CACHE_TIME);
      }
    }

    return access;
  };
  const _checkAuthedAdminWithFullCheck = async () => {
    var adminPolicy = securityDescriptor.admins;

    try {
      return await _checkPolicyCacheResult(adminPolicy);
    } catch (err) {
      if (err instanceof PolicyDelegateTransportError) {
        logger.error('Error communicating with policy delegate backend' + err, { exception: err });
      }

      return false;
    }
  };

  const _checkAuthedAdminWithGoodFaith = function() {
    var adminPolicy = securityDescriptor.admins;

    var rateLimitKey = policyDelegate.getPolicyRateLimitKey(adminPolicy);
    return policyCheckRateLimiter.checkForRecentSuccess(rateLimitKey).then(function(recentSuccess) {
      // Whether or not you're a member, you still get access
      if (recentSuccess) {
        return true;
      } else {
        return _checkAuthedAdminWithFullCheck();
      }
    });
  };

  const canAdmin = async () => {
    debug('canAdmin');

    // Anonymous users can't admin
    if (!userId) return false;

    var adminPolicy = securityDescriptor.admins;

    // Is an extra admin?
    if (containsUserId(securityDescriptor.extraAdmins, userId)) {
      // The user is in extraAdmins...
      debug('canAdmin: allow access for extraAdmin');
      return true;
    }

    if (adminPolicy === 'MANUAL') {
      // If they're not in extraAdmins they're not an admin
      // This rule prevents a group admin to be able to join private conversations
      // https://github.com/troupe/gitter-webapp/pull/2224#pullrequestreview-567691
      debug('canAdmin: deny access for no extraAdmin');
      return false;
    }

    var membersPolicy = securityDescriptor.members;

    if (!policyDelegate) {
      debug('canAdmin: deny access no policy delegate');

      /* No further policy delegate, so no */
      return false;
    }

    // In invite room, in addition to being an admin you also need to
    // be in the room in order to be an admin

    if (membersPolicy === 'INVITE') {
      if (!userId || !contextDelegate) {
        return false;
      }
      const isMember = await contextDelegate.isMember();
      if (!isMember) {
        // Not a member? Then user is not an admin,
        // unless they are in extraAdmins, which will
        // already have successfully returned above
        return false;
      }
    }

    debug('canAdmin: checking policy delegate with policy %s', adminPolicy);
    return _checkAuthedAdminWithGoodFaith();
  };

  const _checkAccessForInviteMembersPolicy = async function() {
    var membersPolicy = securityDescriptor.members;

    assert(membersPolicy === 'INVITE' || membersPolicy === 'INVITE_OR_ADMIN');

    if (!userId || !contextDelegate) {
      return false;
    }
    const isMember = await contextDelegate.isMember();
    return isMember || (await canAdmin());
  };

  /**
   * Authenticated user can access the room, with full check
   */
  const _checkAuthedMembershipWithFullCheck = async () => {
    var membersPolicy = securityDescriptor.members;

    try {
      return await _checkPolicyCacheResult(membersPolicy);
    } catch (err) {
      if (err instanceof PolicyDelegateTransportError) {
        logger.error('Error communicating with policy delegate backend' + err, { exception: err });

        if (!contextDelegate) {
          return false;
        }

        const isMember = await contextDelegate.isMember();
        if (isMember) {
          logger.error(
            'Backend down but allowing user to access room on account of already being a member'
          );
          return true;
        }

        return false;
      }
    }
  };

  /**
   * Authenticated user can access the room, with caching
   */
  const _checkAuthedMembershipWithGoodFaith = function() {
    var membersPolicy = securityDescriptor.members;

    var rateLimitKey = policyDelegate.getPolicyRateLimitKey(membersPolicy);
    return policyCheckRateLimiter.checkForRecentSuccess(rateLimitKey).then(function(recentSuccess) {
      // Whether or not you're a member, you still get access
      if (recentSuccess) {
        return true;
      } else {
        return _checkAuthedMembershipWithFullCheck().then(function(fullCheckResult) {
          // if (!fullCheckResult && isMember) {
          //   // contextDelegate.reportFailure();
          // }

          if (fullCheckResult) return true;
          return canAdmin();
        });
      }
    });
  };

  const _checkAccess = async function(useGoodFailChecks) {
    // TODO: ADD BANS
    var membersPolicy = securityDescriptor.members;

    // Check if the user has been banned
    if (userId && bansIncludesUserId(securityDescriptor.bans, userId)) {
      return false;
    }

    if (securityDescriptor.public) {
      debug('checkAccess: allowing access to public');
      // Shortcut for public rooms
      return true;
    }

    if (userId && containsUserId(securityDescriptor.extraMembers, userId)) {
      // If the user is in extraMembers, always allow them
      // in...
      debug('checkAccess: allowing access to extraMember');
      return true;
    }

    if (membersPolicy === 'INVITE' || membersPolicy === 'INVITE_OR_ADMIN') {
      return _checkAccessForInviteMembersPolicy();
    }

    if (!policyDelegate) {
      return false;
    }

    if (userId) {
      // Logged-in user
      if (useGoodFailChecks) {
        return _checkAuthedMembershipWithGoodFaith();
      } else {
        return _checkAuthedMembershipWithFullCheck();
      }
    }
    return false;
  };

  /**
   * Generally, users can do anything but admin in public rooms except for cases when
   * the room only allows users with a specific provider to join and user is
   * not signed in with that provider
   */
  const fulfillsProviderRequirement = async () => {
    const { providers } = securityDescriptor;
    if (_.isEmpty(providers)) return true;

    const loadedUser = await userLoaderFactory(userId, user)();
    const userProviders = await identityService.listProvidersForUser(loadedUser);
    return userCanJoinRoom(userProviders, providers);
  };

  return {
    canRead: async () => {
      debug('canRead');
      const access = await _checkAccess(true); // With Good Faith
      // If access is denied to the room, let the contextDelegate know
      // so that it can appropriate action
      if (!access && contextDelegate) {
        await contextDelegate.handleReadAccessFailure();
      }
      return access;
    },

    canWrite: async () => {
      // Anonymous users can't write
      if (!userId) return false;
      if (await canAdmin()) return true;
      if (!(await fulfillsProviderRequirement())) return false;
      return _checkAccess(true); // With Good Faith
    },

    /**
     * Similar to canRead, but with a full access check
     */
    canJoin: async () => {
      // Anonymous users can't join
      if (!userId) return false;
      if (await canAdmin()) return true;
      if (!(await fulfillsProviderRequirement())) return false;
      return _checkAccess(false); // Without Good Faith
    },

    canAdmin: canAdmin,

    canAddUser: async () => {
      // Anonymous users can't add user
      if (!userId) return false;
      if (await canAdmin()) return true;
      if (!(await fulfillsProviderRequirement())) return false;
      return _checkAccess(true); // With Good Faith
    }
  };
}

module.exports = createBasePolicy;
