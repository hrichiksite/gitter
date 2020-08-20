'use strict';

var makeBenchmark = require('../make-benchmark');
var Distribution = require('gitter-web-unread-items/lib/distribution');
var _ = require('lodash');
var lazy = require('lazy.js');
var roomMembershipFlags = require('gitter-web-rooms/lib/room-membership-flags');
var MODES = roomMembershipFlags.MODES;

var PRESENCE_VALUES = [
  'inroom',
  'online',
  'mobile',
  'push',
  'push_connected',
  'push_notified',
  'push_notified_connected'
];
var FLAGS_VALUES = [MODES.all, MODES.announcement, MODES.mute];
var optionsMedium, resultsMedium;
var optionsLarge, resultsLarge;

function makeOptions(a, b, c) {
  return {
    announcement: false,
    membersWithFlags: _.range(a).map(function(x) {
      return {
        flags: FLAGS_VALUES[x % FLAGS_VALUES.length],
        userId: String(x)
      };
    }),
    mentions: _.range(b).map(function(x) {
      return String(x);
    }),
    nonMemberMentions: _.range(a + 1, a + c).map(function(x) {
      return String(x);
    }),
    presence: _.range(a + 1, a + c).reduce(function(memo, x) {
      memo[String(x)] = PRESENCE_VALUES[x % (PRESENCE_VALUES.length + 1)];
      return memo;
    }, {})
  };
}
function makeResults(options) {
  var distribution = new Distribution(options);

  var size = distribution.getEngineNotifies().size();

  return lazy.range(size).map(function(x) {
    return {
      userId: String(x),
      badgeUpdate: x % 4 === 0,
      unreadCount: x % 11 === 0 ? undefined : x % 5,
      mentionCount: x % 3 === 0 ? undefined : x % 7
    };
  });
}

function runBenchmarkWith(options, results) {
  var distribution = new Distribution(options);
  var resultsDistribution = distribution.resultsProcessor(results);

  distribution.getNotifyNewRoom().forEach(function() {});

  resultsDistribution.getNewUnreadWithoutMention().forEach(function() {});

  resultsDistribution.getNewUnreadWithMention().forEach(function() {});

  resultsDistribution.getTroupeUnreadCountsChange().forEach(function() {});

  distribution
    .getWebNotifications()
    .toArray()
    .forEach(function() {});

  distribution
    .getPushCandidatesWithoutMention()
    .toArray()
    .forEach(function() {});

  distribution
    .getPushCandidatesWithMention()
    .toArray()
    .forEach(function() {});

  distribution.getConnectedActivityUserIds().forEach(function() {});

  /* Do we need to send the user a badge update? */
  resultsDistribution
    .getBadgeUpdates()
    .toArray()
    .forEach(function() {});
}

makeBenchmark({
  maxTime: 3,
  before: function() {
    optionsMedium = makeOptions(100, 3, 2);
    resultsMedium = makeResults(optionsMedium);

    optionsLarge = makeOptions(20000, 3, 2);
    resultsLarge = makeResults(optionsLarge);
  },
  tests: {
    mediumRoom: function() {
      runBenchmarkWith(optionsMedium, resultsMedium);
    },
    largeRoom: function() {
      runBenchmarkWith(optionsLarge, resultsLarge);
    }
  }
});
