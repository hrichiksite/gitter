#!/usr/bin/env node
/*jslint node: true */
'use strict';

// Usage:
// node scripts/utils/ban-user-from-room.js --admin-username MadLittleMods --target-username EricGitterTester --room-uri grgrgress/community
// node scripts/utils/ban-user-from-room.js --admin-username MadLittleMods --target-username EricGitterTester --room-uri grgrgress/community --unban

const assert = require('assert');
const shutdown = require('shutdown');
const userService = require('gitter-web-users');
const policyFactory = require('gitter-web-permissions/lib/policy-factory');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');

var opts = require('yargs')
  .option('admin-username', {
    required: true,
    description: 'Admin username that will show up for the ban',
    string: true
  })
  .option('target-username', {
    required: true,
    description: 'username to ban e.g trevorah',
    string: true
  })
  .option('room-uri', {
    required: true,
    description: 'room URI to ban user from',
    string: true
  })
  .option('unban', {
    alias: 'u',
    type: 'boolean',
    default: false,
    description: 'unban user from hell'
  })
  .option('remove-messages', {
    type: 'boolean',
    default: false,
    description: 'remove all of the messages from the user'
  })
  .help('help')
  .alias('help', 'h').argv;

async function banUser() {
  const adminUser = await userService.findByUsername(opts.adminUsername);
  assert(adminUser);

  const targetUser = await userService.findByUsername(opts.targetUsername);
  assert(targetUser);

  const troupe = await troupeService.findByUri(opts.roomUri);
  assert(troupe);

  const policy = await policyFactory.createPolicyForRoomId(adminUser, troupe.id);
  const roomWithPolicyService = new RoomWithPolicyService(troupe, adminUser, policy);

  if (opts.unban) {
    console.log('Unbanning user...');
    await roomWithPolicyService.unbanUserFromRoom(targetUser.id);
  } else {
    console.log('Banning user...');
    await roomWithPolicyService.banUserFromRoom(targetUser.username, {
      removeMessages: opts.removeMessages
    });
  }
}

(async () => {
  try {
    await banUser();
    console.log(
      `Successfully ${opts.unban ? 'unbanned' : 'banned'} ${opts.targetUsername} from ${
        opts.roomUri
      } (via admin ${opts.adminUsername})`
    );
  } catch (err) {
    console.log('Error', err, err.stack);
  } finally {
    shutdown.shutdownGracefully();
  }
})();
