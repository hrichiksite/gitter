'use strict';

var lazy = require('lazy.js');
var roomMembershipFlags = require('gitter-web-rooms/lib/room-membership-flags');
var _ = require('lodash');
var assert = require('assert');

function isConnected(memberDetail) {
  var status = memberDetail.presence;

  return (
    status &&
    (status === 'inroom' ||
      status === 'online' ||
      status === 'mobile' ||
      status === 'push_connected' ||
      status === 'push_notified_connected')
  );
}

function hasBeenMentionedPredicate(announcement) {
  return function hasBeenMentioned(memberDetail) {
    var flags = memberDetail.flags;

    return (
      (announcement && roomMembershipFlags.hasNotifyAnnouncement(flags)) ||
      (roomMembershipFlags.hasNotifyMention(flags) && memberDetail.mentioned)
    );
  };
}

function hasNotBeenMentionedPredicate(announcement) {
  return function hasNotBeenMentioned(memberDetail) {
    var flags = memberDetail.flags;

    return (
      !(announcement && roomMembershipFlags.hasNotifyAnnouncement(flags)) &&
      !(roomMembershipFlags.hasNotifyMention(flags) && memberDetail.mentioned)
    );
  };
}

function memberDetailsToUserId(memberWithFlags) {
  return memberWithFlags.userId;
}

function processMemberDetails(membersDetails, mentions, presence) {
  var mentionHash =
    mentions &&
    mentions.length &&
    _.reduce(
      mentions,
      function(memo, userId) {
        memo[userId] = true;
        return memo;
      },
      {}
    );

  _.each(membersDetails, function(membersDetail) {
    var userId = membersDetail.userId;
    membersDetail.mentioned = !!(mentionHash && mentionHash[userId]);
    membersDetail.presence = presence && presence[userId];
    membersDetail.result = null;
  });

  return membersDetails;
}

function Distribution(options) {
  assert(options.membersWithFlags, 'membersWithFlags option required');

  var membersDetails = processMemberDetails(
    options.membersWithFlags,
    options.mentions,
    options.presence
  );
  this._membersDetails = lazy(membersDetails);

  var nonMemberMentions = options.nonMemberMentions;
  if (nonMemberMentions && nonMemberMentions.length) {
    this._nonMemberMentions = lazy(nonMemberMentions);
  } else {
    this._nonMemberMentions = lazy();
  }

  this._announcement = options.announcement || false;
}

Distribution.prototype = {
  /**
   * Used by the unread-item-engine
   * @return array of { userId: .., mention: ... }
   */
  getEngineNotifies: function() {
    var announcement = this._announcement;

    var sequence = this._getEngineMembers().map(function(memberDetail) {
      var flags = memberDetail.flags;

      // This is a non-member who's been mentioned in the room
      if (flags === null) {
        return {
          userId: memberDetail.userId,
          mention: true
        };
      }

      var engineMention =
        (announcement && roomMembershipFlags.hasNotifyAnnouncement(flags)) ||
        (memberDetail.mentioned && roomMembershipFlags.hasNotifyMention(flags));

      return {
        userId: memberDetail.userId,
        mention: !!engineMention
      };
    });

    // Snapshot the sequence
    return lazy(sequence.toArray());
  },

  getEngineRemoveUserIds: function() {
    var sequence = this._getEngineMembers().map(function(memberDetail) {
      return memberDetail.userId;
    });

    // Snapshot the sequence
    return lazy(sequence.toArray());
  },

  _getEngineMembers: function() {
    var announcement = this._announcement;

    return this._membersDetails.filter(function(memberDetail) {
      var flags = memberDetail.flags;

      return (
        flags === null ||
        (roomMembershipFlags.hasNotifyUnread(flags) ||
          (announcement && roomMembershipFlags.hasNotifyAnnouncement(flags)) ||
          (memberDetail.mentioned && roomMembershipFlags.hasNotifyMention(flags)))
      );
    });
  },

  /**
   * Used by the distribution-delta to figure out deltas
   * @return array of userIds of mentioned userIds
   */
  getMentionUserIds: function() {
    var announcement = this._announcement;

    return this._membersDetails
      .filter(function(memberDetail) {
        var flags = memberDetail.flags;

        return (
          (announcement && roomMembershipFlags.hasNotifyAnnouncement(flags)) ||
          (roomMembershipFlags.hasNotifyMention(flags) && memberDetail.mentioned)
        );
      })
      .map(memberDetailsToUserId);
  },

  /**
   * userIds of users who have been mentioned, but are not in the room
   * yet have permission to view the room
   */
  getNotifyNewRoom: function() {
    return this._nonMemberMentions;
  },

  /**
   * userId of users who should get desktop notifications
   */
  getWebNotifications: function() {
    var mentioned = hasBeenMentionedPredicate(this._announcement);

    return this._membersDetails
      .filter(function(memberDetail) {
        if (memberDetail.presence !== 'online') return false;

        var flags = memberDetail.flags;
        return (
          flags === null || roomMembershipFlags.hasNotifyDesktop(flags) || mentioned(memberDetail)
        );
      })
      .map(memberDetailsToUserId);
  },

  /**
   * userId of users who should get push notifications but have
   * not been mentioned
   */
  getPushCandidatesWithoutMention: function() {
    return this._membersDetails
      .filter(hasNotBeenMentionedPredicate(this._announcement))
      .filter(function(memberDetail) {
        var flags = memberDetail.flags;

        var presence = memberDetail.presence;
        return (
          (presence === 'push' || presence === 'push_connected') &&
          roomMembershipFlags.hasNotifyMobile(flags)
        );
      })
      .map(memberDetailsToUserId);
  },

  getPushCandidatesWithMention: function() {
    return this._membersDetails
      .filter(hasBeenMentionedPredicate(this._announcement))
      .filter(function(memberDetail) {
        var presence = memberDetail.presence;
        return (
          presence === 'push' ||
          presence === 'push_connected' ||
          presence === 'push_notified' ||
          presence === 'push_notified_connected'
        );
      })
      .map(memberDetailsToUserId);
  },

  /**
   * Returns a list of activity only users in this distribution
   * who are currently connected
   */
  getConnectedActivityUserIds: function() {
    return this._membersDetails
      .filter(isConnected)
      .filter(function(memberDetail) {
        var flags = memberDetail.flags;
        return roomMembershipFlags.hasNotifyActivity(flags);
      })
      .map(memberDetailsToUserId);
  },

  /**
   * Fast result processor for the usual case
   */
  resultsProcessor: function(unreadItemResults) {
    var itResults = unreadItemResults.getIterator();
    var memberResults = this._getEngineMembers().getIterator();

    while (itResults.moveNext()) {
      if (!memberResults.moveNext()) {
        throw new Error('member and results collection lengths mismatched');
      }

      var memberDetail = memberResults.current();
      var result = itResults.current();

      // Mutates state, which is a pity, but it's very fast and it needs to be
      memberDetail.result = result;
    }

    if (memberResults.moveNext()) {
      throw new Error('member and results collection lengths mismatched');
    }

    return new DistributionResultsProcessor(this._membersDetails, this._announcement);
  },

  resultsProcessorForUpdate: function(unreadItemResults) {
    var unreadItemHash = unreadItemResults.reduce(function(memo, result) {
      memo[result.userId] = result;
      return memo;
    }, {});

    // Mutates state, which is a pity, but it's very fast and it needs to be
    this._membersDetails.forEach(function(memberDetail) {
      memberDetail.result = unreadItemHash[memberDetail.userId];
    });

    return new DistributionResultsProcessor(this._membersDetails, this._announcement);
  }
};

function DistributionResultsProcessor(membersWithFlags, announcement) {
  this._membersDetails = membersWithFlags;
  this._announcement = announcement;
}

DistributionResultsProcessor.prototype = {
  getTroupeUnreadCountsChange: function() {
    return this._membersDetails
      .filter(isConnected)
      .map(function(memberDetail) {
        var userId = memberDetail.userId;
        var result = memberDetail.result;
        if (!result) return;

        var unreadCount = result.unreadCount;
        var mentionCount = result.mentionCount;

        if (unreadCount >= 0 || mentionCount >= 0) {
          return {
            userId: userId,
            total: unreadCount,
            mentions: mentionCount
          };
        }
      })
      .filter(function(f) {
        return !!f;
      });
  },

  getBadgeUpdates: function() {
    return this._membersDetails
      .filter(function(memberDetail) {
        var userResult = memberDetail.result;
        var onlineStatus = memberDetail.presence;

        /* online status null implies the user has no push notification devices */
        return onlineStatus && userResult && userResult.badgeUpdate;
      })
      .map(memberDetailsToUserId);
  },

  getNewUnreadWithMention: function() {
    return this._membersDetails
      .filter(isConnected)
      .filter(hasBeenMentionedPredicate(this._announcement))
      .map(memberDetailsToUserId);
  },

  getNewUnreadWithoutMention: function() {
    return this._membersDetails
      .filter(isConnected)
      .filter(hasNotBeenMentionedPredicate(this._announcement))
      .filter(function(memberDetail) {
        var flags = memberDetail.flags;

        if (roomMembershipFlags.hasNotifyUnread(flags)) return true;
      })
      .map(memberDetailsToUserId);
  }
};

module.exports = Distribution;
