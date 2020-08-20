'use strict';

var makeBenchmark = require('../make-benchmark');
var testRequire = require('../integration/test-require');

var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var unreadItemsServiceEngine = testRequire('gitter-web-unread-items/lib/engine');

var largeUserSet = [];
var largeUserSetSingleMention = [];
var largeUserSetManyMentions = [];
var smallUserSet = [];
var smallUserSetSingleMention = [];
var smallUserSetManyMentions = [];

for (var i = 0; i < 10000; i++) {
  var id = mongoUtils.getNewObjectIdString() + '';
  largeUserSet.push(id);

  if (i % 2 === 0) {
    largeUserSetManyMentions.push(id);
  }

  if (i === 0) {
    largeUserSetSingleMention.push(id);
    smallUserSetSingleMention.push(id);
  }

  if (i < 100) {
    smallUserSet.push(id);
    if (i % 2 === 0) {
      smallUserSetManyMentions.push(id);
    }
  }
}

makeBenchmark({
  after: function(done) {
    if (process.env.DISABLE_EMAIL_NOTIFY_CLEAR_AFTER_TEST) return done();

    var unreadItemServiceEngine = testRequire('gitter-web-unread-items/lib/engine');
    unreadItemServiceEngine.testOnly.removeAllEmailNotifications().nodeify(done);
  },

  tests: {
    'newItemWithNoMentions small room, no mentions': function(done) {
      unreadItemsServiceEngine
        .newItemWithMentions(
          mongoUtils.getNewObjectIdString(),
          mongoUtils.getNewObjectIdString(),
          smallUserSet,
          []
        )
        .nodeify(done);
    },

    'newItemWithNoMentions small room, one mention': function(done) {
      unreadItemsServiceEngine
        .newItemWithMentions(
          mongoUtils.getNewObjectIdString(),
          mongoUtils.getNewObjectIdString(),
          smallUserSet,
          smallUserSetSingleMention
        )
        .nodeify(done);
    },

    'newItemWithNoMentions small room, many mentions': function(done) {
      unreadItemsServiceEngine
        .newItemWithMentions(
          mongoUtils.getNewObjectIdString(),
          mongoUtils.getNewObjectIdString(),
          smallUserSet,
          smallUserSetManyMentions
        )
        .nodeify(done);
    },

    'newItemWithNoMentions large room, no mentions': function(done) {
      unreadItemsServiceEngine
        .newItemWithMentions(
          mongoUtils.getNewObjectIdString(),
          mongoUtils.getNewObjectIdString(),
          largeUserSet,
          []
        )
        .nodeify(done);
    },

    'newItemWithNoMentions large room, one mention': function(done) {
      unreadItemsServiceEngine
        .newItemWithMentions(
          mongoUtils.getNewObjectIdString(),
          mongoUtils.getNewObjectIdString(),
          largeUserSet,
          largeUserSetSingleMention
        )
        .nodeify(done);
    },

    'newItemWithNoMentions large room, many mentions': function(done) {
      unreadItemsServiceEngine
        .newItemWithMentions(
          mongoUtils.getNewObjectIdString(),
          mongoUtils.getNewObjectIdString(),
          largeUserSet,
          largeUserSetManyMentions
        )
        .nodeify(done);
    }
  }
});
