#!/usr/bin/env node
'use strict';

var emailNotificationService = require('gitter-web-email-notifications');
var Promise = require('bluebird');
var invitesService = require('gitter-web-invites/lib/invites-service');
var logger = require('gitter-web-env').logger;

// @const
var REMINDER_DAYS = 3;

// if something goes terribly wrong use this
function die(err) {
  logger.error('Catastrophic error: ' + err, { exception: err });
  process.exit(1);
}

invitesService
  .findInvitesForReminder(REMINDER_DAYS)
  .tap(function(inviteReminders) {
    return Promise.map(
      inviteReminders,
      function(inviteReminder) {
        var troupe = inviteReminder.troupe;
        var invite = inviteReminder.invite;
        var invitedByUser = inviteReminder.invitedByUser;

        if (!troupe || !invitedByUser) {
          return invitesService.markInviteReminded(invite._id);
        } else {
          return emailNotificationService
            .sendInvitationReminder(invitedByUser, invite, troupe)
            .catch(function(err) {
              logger.error("Couldn't notify invite: ", { id: invite._id, exception: err });
            })
            .then(function() {
              return invitesService.markInviteReminded(invite._id);
            });
        }
      },
      { concurrency: 10 }
    );
  })
  .then(function(inviteReminders) {
    logger.info('invitation reminder sent for ' + inviteReminders.length + ' invites(s)');
    process.exit();
  })
  .catch(die);
