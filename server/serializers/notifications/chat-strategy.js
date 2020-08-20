'use strict';

var UserIdStrategy = require('gitter-web-user-serialization/lib/notifications/user-id-strategy');

function ChatStrategy(options) {
  if (!options) options = {};

  var userStategy = new UserIdStrategy(options);

  this.preload = function(items) {
    var users = items.map(function(i) {
      return i.fromUserId;
    });

    return userStategy.preload(users);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      html: item.html,
      sent: item.sent,
      mentions: item.mentions,
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId)
    };
  };
}

ChatStrategy.prototype = {
  name: 'ChatStrategy'
};

module.exports = ChatStrategy;
