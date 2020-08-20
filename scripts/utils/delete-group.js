#!/usr/bin/env node
/*jslint node: true */
'use strict';

const Promise = require('bluebird');
const shutdown = require('shutdown');
const readline = require('readline');
const groupService = require('gitter-web-groups');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('uri', {
    alias: 'u',
    required: true,
    description: 'URI of group to remove',
    string: true
  })
  .help('help')
  .alias('help', 'h').argv;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

groupService
  .findByUri(opts.uri)
  .then(group => {
    if (!group) {
      throw new Error(`Group with URI ${opts.uri} does not exist`);
    }

    return new Promise(function(resolve, reject) {
      rl.question(
        `Are you sure you want to delete the ${group.uri} group and the rooms in it? (yes/no)`,
        function(answer) {
          rl.close();
          console.log(`Answered: ${answer}`);

          if (answer === 'yes') {
            resolve(group);
          } else {
            reject(new Error('Answered no'));
          }
        }
      );
    });
  })
  .then(function(group) {
    return groupService.deleteGroup(group);
  })
  .then(function() {
    console.log('Group and rooms deleted!');
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    shutdown.shutdownGracefully(1);
  })
  .done();
