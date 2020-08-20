'use strict';

var env = require('gitter-web-env');
var errorReporter = env.errorReporter;
var logger = env.logger;

var appEvents = require('gitter-web-appevents');
var presenceService = require('gitter-web-presence');
var onlineNotificationGeneratorService = require('../services/notifications/online-notification-generator-service');
var pushNotificationPostbox = require('../services/notifications/push-notification-postbox');
var debug = require('debug')('gitter:app:notification-event-listener');
var pushNotificationGateway = require('../gateways/push-notification-gateway');
var pushNotificationFilter = require('gitter-web-push-notification-filter');

//
// This installs the listeners that will listen to events
//
var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  /* New online notification */
  appEvents.onNewOnlineNotification(function(troupeId, chatId, userIds) {
    return onlineNotificationGeneratorService
      .sendOnlineNotifications(troupeId, chatId, userIds)
      .catch(function(err) {
        logger.error('Error while generating online notifications: ' + err, { exception: err });
      });
  });

  /* New push notification */
  appEvents.onNewPushNotificationForChat(function(troupeId, chatId, userIds, mentioned) {
    return pushNotificationPostbox
      .queueNotificationsForChat(troupeId, chatId, userIds, mentioned)
      .catch(function(err) {
        logger.error('Error while generating push notification: ' + err, { exception: err });
      });
  });

  /* Badge count update */
  appEvents.onBatchUserBadgeCountUpdate(function(data) {
    var userIds = data.userIds;
    debug('Publishing badge count updates for %s  users.', userIds.length);

    return pushNotificationGateway.sendUsersBadgeUpdates(userIds).catch(function(err) {
      logger.error('Error while calling sendUsersBadgeUpdates. Silently ignoring. ' + err, {
        exception: err
      });
      errorReporter(err, { users: userIds }, { module: 'notification-event-listener' });
    });
  });

  presenceService.on('eyeballSignal', function(userId, troupeId, eyeballSignal) {
    if (!eyeballSignal) return; // Only clear the notifications when signals eyeballs on

    return pushNotificationFilter
      .resetNotificationsForUserTroupe(userId, troupeId)
      .catch(function(err) {
        logger.error(
          'Error while calling resetNotificationsForUserTroupe. Silently ignoring. ' + err,
          { exception: err }
        );
      });
  });
};
