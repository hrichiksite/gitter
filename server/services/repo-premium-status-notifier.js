'use strict';

var troupeDao = require('./daos/troupe-dao').lean;
var appEvents = require('gitter-web-appevents');
var userService = require('gitter-web-users');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var debug = require('debug')('gitter:app:repo-premium-status-notifier');

function repoPremiumStatusNotifier(userOrOrg, premiumStatus) {
  return userService.findByUsername(userOrOrg).then(function(user) {
    var isOrg = !user;

    if (!isOrg) {
      debug('Notifying of user premium status change: %s', userOrOrg);
      // For a user
      appEvents.dataChange2(
        '/user/' + user._id,
        'patch',
        {
          id: '' + user._id,
          premium: premiumStatus
        },
        'user'
      );
    }

    debug('Searching for all rooms owned by: %s', userOrOrg);
    return troupeDao
      .findByOwnerUri(userOrOrg, { _id: 1 })
      .then(function(troupes) {
        debug('Found %s rooms owned by %s', troupes.length, userOrOrg);

        var troupeIds = troupes.map(function(troupe) {
          return troupe._id;
        });

        debug('Search for all users in all rooms owned by %s', userOrOrg);
        return roomMembershipService.findMembersForRoomMulti(troupeIds);
      })
      .then(function(troupeUsersHash) {
        var count = 0;
        var userNotificatons = {};

        Object.keys(troupeUsersHash).forEach(function(troupeId) {
          var userIds = troupeUsersHash[troupeId];

          userIds.forEach(function(userId) {
            count++;
            if (isOrg) {
              // TODO: come up with a better mapping from org to user
              if (!userNotificatons[userId]) {
                // Only do this once per user
                userNotificatons[userId] = true;

                appEvents.dataChange2(
                  '/user/' + userId + '/orgs',
                  'patch',
                  {
                    name: userOrOrg, // Id for org is the name
                    premium: premiumStatus
                  },
                  'user'
                );
              }
            }

            appEvents.dataChange2(
              '/user/' + userId + '/rooms',
              'patch',
              {
                id: '' + troupeId,
                premium: premiumStatus
              },
              'room'
            );
          });
        });

        debug('Notified %s users of change of premium status', count);
      });
  });
}

module.exports = repoPremiumStatusNotifier;
