'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('group-creation');
var errorReporter = env.errorReporter;
var stats = env.stats;

var Promise = require('bluebird');
var groupService = require('gitter-web-groups/lib/group-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var GroupWithPolicyService = require('./group-with-policy-service');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');
var clientEnv = require('gitter-client-env');
var twitterBadger = require('gitter-web-twitter/lib/twitter-badger');
var identityService = require('gitter-web-identity');
var debug = require('debug')('gitter:app:group-creation-service');

/**
 * @private
 * @return inviteReport
 */
var sendInvitesForRoom = Promise.method(function(user, room, invites) {
  if (!invites || !invites.length) return [];

  // Invite all the users
  return policyFactory.createPolicyForRoomId(user, room._id).then(function(userRoomPolicy) {
    var roomWithPolicyService = new RoomWithPolicyService(room, user, userRoomPolicy);

    debug('Sending invites: %j', invites);

    // Some of these can fail, but the errors will be caught and added to
    // the report that the promise resolves to.
    return roomWithPolicyService.createRoomInvitations(invites);
  });
});

/**
 * @private
 */
var sendTweetsForRoom = Promise.method(function(user, group, room, twitterHandles) {
  if (!twitterHandles.length) return;

  return identityService.getIdentityForUser(user, 'twitter').then(function(identity) {
    if (!identity) return;

    user.twitterUsername = identity.username;
    debug('Sending tweets to: %j', twitterHandles);

    var usersToTweet = twitterHandles.map(function(twitterUsername) {
      return {
        twitterUsername: twitterUsername
      };
    });

    var roomUrl = room.lcUri
      ? clientEnv['basePath'] + '/' + room.lcUri + '?source=twitter-badger'
      : undefined;

    stats.event('new_group_tweets', {
      userId: user.id,
      username: user.username,
      groupId: group._id,
      groupUri: group.uri,
      count: usersToTweet.length
    });

    var name = group.name || group.uri;
    return twitterBadger.sendUserInviteTweets(user, usersToTweet, name, roomUrl);
  });
});

/**
 * @private
 */
function sendInvitesAndTweetsPostRoomCreation(user, group, room, invites, allowTweeting) {
  return sendInvitesForRoom(user, room, invites)
    .tap(function(invitesReport) {
      var added = 0;
      var invited = 0;

      invitesReport.forEach(function(report) {
        switch (report.status) {
          case 'added':
            added++;
            break;
          case 'invited':
            invited++;
            break;
        }
      });

      stats.event('new_group_invites', {
        userId: user.id,
        username: user.username,
        groupId: group._id,
        groupUri: group.uri,
        count: added + invited,
        added: added,
        invited: invited
      });

      var twitterHandles = invitesReport
        .filter(function(report) {
          return (
            report.status === 'error' &&
            report.inviteInfo.type === 'twitter' &&
            report.inviteInfo.externalId
          );
        })
        .map(function(report) {
          return report.inviteInfo.externalId;
        });

      if (!allowTweeting) return;

      return sendTweetsForRoom(user, group, room, twitterHandles).catch(function(err) {
        stats.event('group_tweets_failed', {
          userId: user.id,
          username: user.username,
          groupId: group._id,
          groupUri: group.uri
        });
        logger.error('Group tweet send failed', { exception: err });
        errorReporter(
          err,
          { post_room_creation: 'failed', step: 'tweets' },
          { module: 'group-creation' }
        );
      });
    })
    .catch(function(err) {
      stats.event('group_invites_failed', {
        userId: user.id,
        username: user.username,
        groupId: group._id,
        groupUri: group.uri
      });

      logger.error('Send invites failed', { exception: err });
      errorReporter(
        err,
        { post_room_creation: 'failed', step: 'invites' },
        { module: 'group-creation' }
      );
      return []; // No invites report for you
    });
}

/**
 * Create a group with a default room and invite some people
 *
 * Returns
 *  {
 *    group: ...,
 *    defaultRoom: ...,
 *    invitesReport: ...
 *  }
 */
function groupCreationService(user, options) {
  var invites = options.invites;
  var defaultRoomOptions = options.defaultRoom;
  var allowTweeting = options.allowTweeting;

  return groupService
    .createGroup(user, options)
    .bind({
      group: null,
      defaultRoom: null,
      invitesReport: null,
      hookCreationFailedDueToMissingScope: null
    })
    .then(function(group) {
      this.group = group;
      return policyFactory.createPolicyForGroupId(user, group._id);
    })
    .then(function(userGroupPolicy) {
      var group = this.group;
      var groupWithPolicyService = new GroupWithPolicyService(group, user, userGroupPolicy);

      var defaultRoomName = defaultRoomOptions.defaultRoomName || 'community';
      var associateWithGitHubRepo;

      // If the group is backed by a REPO
      // associate the community room with that repo
      if (group.sd.type === 'GH_REPO') {
        associateWithGitHubRepo = group.sd.linkPath;
      }

      return groupWithPolicyService.createRoom({
        name: defaultRoomName,
        security: 'PUBLIC',
        type: 'GROUP',
        associateWithGitHubRepo: associateWithGitHubRepo,
        addBadge: defaultRoomOptions.addBadge,
        providers: defaultRoomOptions.providers
      });
    })
    .then(function(createRoomResult) {
      this.hookCreationFailedDueToMissingScope =
        createRoomResult.hookCreationFailedDueToMissingScope;
      var defaultRoom = (this.defaultRoom = createRoomResult.troupe);

      return sendInvitesAndTweetsPostRoomCreation(
        user,
        this.group,
        defaultRoom,
        invites,
        allowTweeting
      );
    })
    .then(function(invitesReport) {
      var group = this.group;
      stats.event('group_process_complete', {
        userId: user.id,
        username: user.username,
        groupId: group._id,
        groupUri: group.uri
      });

      this.invitesReport = invitesReport;
      return this;
    })
    .catch(function(e) {
      logger.error('Group creation failure', {
        exception: e,
        username: user && user.username,
        userId: user && user._id,
        options: options
      });
      throw e;
    });
}

module.exports = Promise.method(groupCreationService);
