'use strict';

var Promise = require('bluebird');
var createDistribution = require('./create-distribution');

function toString(f) {
  if (!f) return '';
  return '' + f;
}

/**
 * Given a set of original mentions and a chat message, returns
 * { addNotify: [userIds], addMentions: [userIds], remove: [userIds], addNewRoom: [userIds] }
 * Which consist of users no longer mentioned in a message and
 * new users who are now mentioned in the message, who were not
 * previously.
 */
function generateMentionDeltaSet(newNotifies, originalMentions) {
  var newNotifyUserIds = newNotifies.map(function(memberWithMention) {
    return toString(memberWithMention.userId);
  });

  var newMentionUserIds = newNotifies
    .filter(function(memberWithMention) {
      return memberWithMention.mention;
    })
    .map(function(memberWithMention) {
      return toString(memberWithMention.userId);
    });

  var originalMentionUserIdStrings = originalMentions.map(toString);

  var addMentions = newMentionUserIds.without(originalMentionUserIdStrings);
  var removeMentions = originalMentionUserIdStrings.without(newMentionUserIds);

  /*
   * List of users who should get unread items, who were previously mentioned
   * but no longer are
   */
  var forNotifyWithRemoveMentions = newNotifyUserIds.intersection(removeMentions);

  /*
   * Everyone who was added via a mention, plus everyone who was no longer
   * mentioned but is not lurking
   */
  var addWithoutMentionSeq = forNotifyWithRemoveMentions.map(function(userId) {
    return {
      userId: userId,
      mention: false
    };
  });

  var addWithMentionSequence = addMentions.map(function(userId) {
    return {
      userId: userId,
      mention: true
    };
  });

  var add = addWithoutMentionSeq.concat(addWithMentionSequence);

  return {
    add: add,
    remove: removeMentions
  };
}

function deltaDistributions(newDistribution, originalDistribution) {
  var newNotifies = newDistribution.getEngineNotifies();
  var originalMentions = originalDistribution.getMentionUserIds();
  return generateMentionDeltaSet(newNotifies, originalMentions);
}

function createDelta(fromUserId, troupe, newMentions, originalMentions) {
  return Promise.join(
    createDistribution(fromUserId, troupe, newMentions),
    createDistribution(fromUserId, troupe, originalMentions, { delta: true }),
    function(newDistribution, originalDistribution) {
      return [deltaDistributions(newDistribution, originalDistribution), newDistribution];
    }
  );
}

module.exports = createDelta;
