#!/usr/bin/env node
/*jslint node: true */
'use strict';

/* This scripts generates test users and rooms to be used if developer hasn't configured OAuth */

// default log level is error
// can be changed with `env "logging:level=info" ./scripts/utils/<name of this script>.js`
process.env['logging:level'] = process.env['logging:level'] || 'error';

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const shutdown = require('shutdown');
const env = require('gitter-web-env');
const config = env.config;

require('../../server/event-listeners').install();

const createdFixtures = {};

fixtureLoader
  .manual(createdFixtures, {
    user1: {
      accessToken: 'web-internal'
    },
    user2: {
      accessToken: 'web-internal'
    },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1'],
      securityDescriptor: {
        extraAdmins: ['user1']
      }
    }
  })()
  .then(() => {
    const { user1, user2, troupe1 } = createdFixtures;
    const basepath = config.get('web:basepath');

    console.log('========================');
    console.log("You've successfully created seed data\n");
    console.log(`There is now a public room ${basepath}/${troupe1.uri}\n`);
    console.log(`And there are two users:\n`);
    console.log(
      `User A (${user1.username}) is an admin of the room\n    - you can log in by going to ${basepath}/?access_token=${user1.accessToken}`
    );
    console.log(
      `User B (${user2.username}) is not a member of the room\n    - you can log in by going to ${basepath}/?access_token=${user2.accessToken}`
    );
    console.log('========================');

    shutdown.shutdownGracefully(0);
  })
  .catch(err => {
    console.error(err);
    shutdown.shutdownGracefully(1);
  });
