#!/usr/bin/env node
'use strict';

const ObjectID = require('mongodb').ObjectID;
const shutdown = require('shutdown');
const userService = require('gitter-web-users');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const emailNotificationService = require('gitter-web-email-notifications');

const opts = require('yargs')
  .option('inviting-username', {
    alias: 'u',
    required: true,
    description: 'username of user to send email to',
    string: true
  })
  .option('email', {
    alias: 'e',
    required: true,
    description: 'email to send the invite to',
    string: true
  })
  .option('room-uri', {
    alias: 'r',
    required: true,
    description: 'Room to invite someone to',
    string: true
  })
  .help('help')
  .alias('help', 'h').argv;

async function sendEmail() {
  const invitingUser = await userService.findByUsername(opts.invitingUsername);
  const room = await troupeService.findByUri(opts.roomUri);

  const fakeInvite = {
    _id: new ObjectID(),
    secret: 'x123',
    emailAddress: opts.email
  };

  return emailNotificationService.sendInvitation(invitingUser, fakeInvite, room);
}

sendEmail()
  .then(({ fake }) => {
    console.log(`Using fake mailer? ${fake}`);
  })
  .catch(err => {
    console.log('err', err, err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
