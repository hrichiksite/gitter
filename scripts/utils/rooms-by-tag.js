#!/usr/bin/env node
'use strict';

var yargs = require('yargs');
var _ = require('lodash');
var shutdown = require('shutdown');

var exploreService = require('../../server/services/explore-service');
var shimPositionOption = require('../yargs-shim-position-option');
var debug = require('debug')('gitter:infra:rooms-by-tag');

var opts = yargs
  .option(
    'tag',
    shimPositionOption({
      position: 0,
      required: true,
      description: 'tag to look up'
    })
  )
  .help('help')
  .alias('help', 'h').argv;

function run() {
  debug('start');
  return exploreService.fetchByTagsCached([opts.tag]).then(function(rooms) {
    debug('done');
    console.log(_.pluck(rooms, 'uri'));
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
