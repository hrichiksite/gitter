'use strict';

var UserIdStrategy = require('gitter-web-user-serialization/lib/notifications/user-id-strategy');

function TroupeStrategy(options) {
  if (!options) options = {};

  var userStategy = new UserIdStrategy(options);

  var recipientUserId = options.recipientUserId;

  this.preload = function(items) {
    var userIds = items
      .map(function(t) {
        if (t.oneToOne) {
          if (recipientUserId) {
            return getOtherUserId(t);
          } else {
            // Return all the userIds if one was not specified
            return t.oneToOneUsers.map(function(oneToOneUser) {
              return oneToOneUser.userId;
            });
          }
        }
      })
      .flatten()
      .filter(function(f) {
        return !!f;
      });

    if (userIds.isEmpty()) return;

    return userStategy.preload(userIds);
  };

  function getOtherUserId(troupe) {
    if (!recipientUserId || !troupe.oneToOne || !troupe.oneToOneUsers) return undefined;

    for (var i = 0; i < troupe.oneToOneUsers.length; i++) {
      var oneToOneUser = troupe.oneToOneUsers[i];
      if ('' + oneToOneUser.userId !== '' + recipientUserId) {
        return oneToOneUser.userId;
      }
    }
  }

  function getHomeUrl(user) {
    if (!user) return undefined;
    return '/' + user.username;
  }

  function getUrlUserMap(troupe) {
    if (recipientUserId || !troupe.oneToOne) return undefined;

    return troupe.oneToOneUsers.reduce(function(memo, oneToOneUser) {
      var userId = oneToOneUser.userId;
      var user = userStategy.map(userId);
      memo[userId] = user && getHomeUrl(user);
      return memo;
    }, {});
  }

  function getNameUserMap(troupe) {
    if (recipientUserId || !troupe.oneToOne) return undefined;

    return troupe.oneToOneUsers.reduce(function(memo, oneToOneUser) {
      var userId = oneToOneUser.userId;
      var user = userStategy.map(userId);
      memo[userId] = user && user.displayName;
      return memo;
    }, {});
  }

  this.map = function(item) {
    var user;
    if (item.oneToOne) {
      var otherUserId = getOtherUserId(item);
      user = otherUserId && userStategy.map(otherUserId);
    }

    var t = {
      id: item.id || item._id,
      name: item.oneToOne ? user && user.displayName : item.name,
      uri: item.uri,
      oneToOne: item.oneToOne,
      user: user,
      url: item.oneToOne ? user && user && getHomeUrl(user) : '/' + item.uri,
      urlUserMap: item.oneToOne && getUrlUserMap(item),
      nameUserMap: item.oneToOne && getNameUserMap(item)
    };

    return t;
  };
}

TroupeStrategy.prototype = {
  name: 'TroupeStrategy'
};

module.exports = TroupeStrategy;
