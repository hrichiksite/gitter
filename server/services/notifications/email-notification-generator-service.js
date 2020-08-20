'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var config = env.config;
var stats = env.stats;

var _ = require('lodash');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var userService = require('gitter-web-users');
var unreadItemService = require('gitter-web-unread-items');
var serializer = require('../../serializers/notification-serializer');
var moment = require('moment');
var Promise = require('bluebird');
var collections = require('gitter-web-utils/lib/collections');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var emailNotificationService = require('gitter-web-email-notifications');
var userSettingsService = require('gitter-web-user-settings');
var debug = require('debug')('gitter:app:email-notification-generator-service');
var userScopes = require('gitter-web-identity/lib/user-scopes');

var filterTestValues = config.get('notifications:filterTestValues');

var timeBeforeNextEmailNotificationS =
  config.get('notifications:timeBeforeNextEmailNotificationMins') * 60;
var emailNotificationsAfterMins = config.get('notifications:emailNotificationsAfterMins');

function isTestId(id) {
  return id.indexOf('USER') === 0 || id.indexOf('TROUPE') === 0 || !mongoUtils.isLikeObjectId(id);
}

/**
 * Send email notifications to users. Returns true if there were any outstanding
 * emails in the queue
 */
function sendEmailNotifications(since) {
  var start = Date.now();
  if (!since) {
    since = moment()
      .subtract('m', emailNotificationsAfterMins)
      .valueOf();
  }

  var hadEmailsInQueue;

  return (
    unreadItemService
      .listTroupeUsersForEmailNotifications(since, timeBeforeNextEmailNotificationS)
      .then(function(userTroupeUnreadHash) {
        hadEmailsInQueue = !!Object.keys(userTroupeUnreadHash).length;

        if (!filterTestValues) return userTroupeUnreadHash;

        /* Remove testing rubbish */
        Object.keys(userTroupeUnreadHash).forEach(function(userId) {
          if (isTestId(userId)) {
            delete userTroupeUnreadHash[userId];
            return;
          }

          Object.keys(userTroupeUnreadHash[userId]).forEach(function(troupeId) {
            if (isTestId(troupeId)) {
              delete userTroupeUnreadHash[userId][troupeId];
              if (Object.keys(userTroupeUnreadHash[userId]).length === 1) {
                delete userTroupeUnreadHash[userId];
              }
            }
          });
        });

        return userTroupeUnreadHash;
      })
      .then(function(userTroupeUnreadHash) {
        /**
         * Filter out all users who've opted out of notification emails
         */
        var userIds = Object.keys(userTroupeUnreadHash);
        debug('Initial user count %s', userIds.length);
        if (!userIds.length) return {};

        return userSettingsService
          .getMultiUserSettings(userIds, 'unread_notifications_optout')
          .then(function(settings) {
            // Check which users have opted out
            userIds.forEach(function(userId) {
              // If unread_notifications_optout is truish, the
              // user has opted out
              if (settings[userId]) {
                debug(
                  'User %s has opted out of unread_notifications, removing from results',
                  userId
                );
                delete userTroupeUnreadHash[userId];
              }
            });

            return userTroupeUnreadHash;
          });
      })
      // .then(function(userTroupeUnreadHash) {
      //   /**
      //    * Now we need to filter out users who've turned off notifications for a specific troupe
      //    */
      //   var userTroupes = [];
      //   var userIds = Object.keys(userTroupeUnreadHash);
      //
      //   if(!userIds.length) return {};
      //
      //   debug('After removing opt-out users: %s', userIds.length);
      //
      //   userIds.forEach(function(userId) {
      //       var troupeIds = Object.keys(userTroupeUnreadHash[userId]);
      //       troupeIds.forEach(function(troupeId) {
      //         userTroupes.push({ userId: userId, troupeId: troupeId });
      //       });
      //   });
      //
      //   return userRoomNotificationService.findSettingsForMultiUserRooms(userTroupes)
      //     .then(function(notificationSettings) {
      //       Object.keys(userTroupeUnreadHash).forEach(function(userId) {
      //           var troupeIds = Object.keys(userTroupeUnreadHash[userId]);
      //           troupeIds.forEach(function(troupeId) {
      //             var setting = notificationSettings[userId + ':' + troupeId];
      //
      //             if(setting && setting !== 'all') {
      //               debug('User %s has disabled notifications for this troupe', userId);
      //               delete userTroupeUnreadHash[userId][troupeId];
      //
      //               if(Object.keys(userTroupeUnreadHash[userId]).length === 0) {
      //                 delete userTroupeUnreadHash[userId];
      //               }
      //             }
      //           });
      //       });
      //
      //       return userTroupeUnreadHash;
      //     });
      // })
      .then(function(userTroupeUnreadHash) {
        /**
         *load the data we're going to need for the emails
         */
        var userIds = Object.keys(userTroupeUnreadHash);
        if (!userIds.length) return [userIds, [], [], {}];

        debug('After removing room non-notify users: %s', userIds.length);

        var troupeIds = _.flatten(
          Object.keys(userTroupeUnreadHash).map(function(userId) {
            return Object.keys(userTroupeUnreadHash[userId]);
          })
        );

        return Promise.all([
          userIds,
          userService.findByIds(userIds),
          troupeService.findByIds(troupeIds),
          userTroupeUnreadHash
        ]);
      })
      .spread(function(userIds, users, allTroupes, userTroupeUnreadHash) {
        if (!userIds.length) return [userIds, [], [], {}];

        /* Remove anyone that we don't have a token for */
        users = users.filter(function(user) {
          // Using isGitHubUser is bad, but loading the user's identities just to be
          // able to call into the exact right backend is really slow for this
          // use case. The right way is to use the backend muxer.
          if (userScopes.isGitHubUser(user)) {
            return userScopes.hasGitHubScope(user, 'user:email');
          } else {
            // NOTE: some twitter accounts might not actually have an email address
            return true;
          }
        });

        userIds = users.map(function(user) {
          return user.id;
        });

        debug('After removing users without the correct token: %s', userIds.length);

        return [userIds, users, allTroupes, userTroupeUnreadHash];
      })
      .spread(function(userIds, users, allTroupes, userTroupeUnreadHash) {
        if (!userIds.length) return;

        /**
         * Step 2: loop through the users
         */
        var troupeHash = collections.indexById(allTroupes);
        var userHash = collections.indexById(users);

        var count = 0;

        // Limit the loop to 10 simultaneous sends
        return Promise.map(
          userIds,
          function(userId) {
            var user = userHash[userId];
            if (!user) return;

            var strategy = new serializer.TroupeStrategy({ recipientUserId: user.id });

            var unreadItemsForTroupe = userTroupeUnreadHash[user.id];
            var troupeIds = Object.keys(unreadItemsForTroupe);
            var troupes = troupeIds
              .map(function(troupeId) {
                return troupeHash[troupeId];
              })
              .filter(collections.predicates.notNull);

            return serializer.serialize(troupes, strategy).then(function(serializedTroupes) {
              var troupeData = serializedTroupes
                .map(function(t) {
                  var a = userTroupeUnreadHash[userId];
                  var b = a && a[t.id];
                  var unreadCount = b && b.length;

                  if (b) {
                    b.sort();
                  }

                  return { troupe: t, unreadCount: unreadCount, unreadItems: b };
                })
                .filter(function(d) {
                  return !!d.unreadCount; // This needs to be one or more
                });

              // Somehow we've ended up with no chat messages?
              if (!troupeData.length) return;

              var chatIdsForUser = troupeData.reduce(function(memo, d) {
                return memo.concat(d.unreadItems.slice(-3));
              }, []);

              var chatStrategy = new serializer.ChatIdStrategy({ recipientUserId: user.id });
              return serializer.serialize(chatIdsForUser, chatStrategy).then(function(chats) {
                var chatsIndexed = collections.indexById(chats);

                troupeData.forEach(function(d) {
                  // Reassemble the chats for the troupe
                  d.chats = d.unreadItems.slice(-3).reduce(function(memo, chatId) {
                    var chat = chatsIndexed[chatId];
                    if (chat) {
                      memo.push(chat);
                    }
                    return memo;
                  }, []);
                });

                count++;
                return emailNotificationService
                  .sendUnreadItemsNotification(user, troupeData)
                  .catch(function(err) {
                    if (err.gitterAction === 'logout_destroy_user_tokens') {
                      stats.event('logout_destroy_user_tokens', { userId: user.id });

                      userService.destroyTokensForUserId(user.id);
                    }
                  });
              });
            });
          },
          { concurrency: 10 }
        ).then(function() {
          var time = Date.now() - start;
          logger.info('Sent unread notification emails to ' + count + ' users in ' + time + 'ms');
          stats.gaugeHF('unread_email_notifications.sent_emails', count, 1);
        });
      })
      .then(function() {
        /* Return whether the queue was empty or not */
        return hadEmailsInQueue;
      })
  );
}

module.exports = sendEmailNotifications;
