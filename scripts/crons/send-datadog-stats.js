#!/usr/bin/env node

'use strict';

var persistence = require('gitter-web-persistence');
var config = require('gitter-web-env');
var stats = config.stats;
var Promise = require('bluebird');

Promise.all([
  persistence.User.count().exec(),
  persistence.ChatMessage.count().exec(),
  persistence.Troupe.count({ security: 'PUBLIC' }).exec(),
  persistence.Troupe.count({ security: 'PRIVATE' }).exec(),
  persistence.Troupe.count({ githubType: 'ORG' }).exec()
])
  .spread(function(users, messages, public_rooms, private_rooms, org_rooms) {
    // The "1" after the count is the frequency, 1 == not sampled.
    stats.gaugeHF('counts.users', users, 1);
    stats.gaugeHF('counts.messages', messages, 1);
    stats.gaugeHF('counts.public_rooms', public_rooms, 1);
    stats.gaugeHF('counts.private_rooms', private_rooms, 1);
    stats.gaugeHF('counts.org_rooms', org_rooms, 1);
  })
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    console.error('[datadog-counts] Something went wrong: ', err);
    process.exit(1);
  });
