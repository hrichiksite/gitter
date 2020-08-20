'use strict';

var Promise = require('bluebird');
var TroupeIdStrategy = require('./troupe-id-strategy');
var UserIdStrategy = require('./user-id-strategy');

function SampleChatStrategy() {
  var userStrategy = new UserIdStrategy();
  var troupeStrategy = new TroupeIdStrategy();

  this.preload = function(items) {
    var userIds = items.map(function(i) {
      return i.fromUserId;
    });
    var troupeIds = items.map(function(i) {
      return i.toTroupeId;
    });

    return Promise.join(userStrategy.preload(userIds), troupeStrategy.preload(troupeIds));
  };

  this.map = function(item) {
    var user = userStrategy.map(item.fromUserId);
    var troupe = troupeStrategy.map(item.toTroupeId);

    if (!user || !troupe || !troupe.uri) return;
    return {
      avatarUrl: user.avatarUrlSmall,
      username: user.username,
      displayName: user.displayName,
      room: troupe.uri
    };
  };
}

SampleChatStrategy.prototype = {
  name: 'SampleChatStrategy'
};

module.exports = SampleChatStrategy;
