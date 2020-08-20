#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var yargs = require('yargs');
var shutdown = require('shutdown');
var userService = require('gitter-web-users');
var shimPositionOption = require('../yargs-shim-position-option');
var restful = require('../../server/services/restful');
var cliff = require('cliff');

var opts = yargs
  .option(
    'username',
    shimPositionOption({
      position: 0,
      required: true,
      description: 'username to look up e.g trevorah',
      string: true
    })
  )
  .help('help')
  .alias('help', 'h').argv;

function run() {
  return userService
    .findByUsername(opts.username)
    .then(function(user) {
      return restful.serializeGroupsForUserId(user._id);
    })
    .then(function(results) {
      var sorted = _.sortBy(results, 'name');
      console.log(cliff.stringifyObjectRows(sorted, ['id', 'uri', 'name']));
    });
}

run()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    process.exit(1);
    shutdown.shutdownGracefully(1);
  });
