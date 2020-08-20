#!/usr/bin/env node
'use strict';

var opts = require('yargs')
  .option('uri', {
    alias: 'r',
    required: true,
    description: 'The room uri to be tagged.'
  })
  .option('tags', {
    alias: 't',
    required: true,
    description: 'A list of tags to be added.',
    type: 'array'
  })
  .option('keep-original', {
    default: true,
    description: 'A list of tags to be added.',
    type: 'boolean'
  })
  .help('help')
  .alias('help', 'h').argv;

var troupeService = require('gitter-web-rooms/lib/troupe-service');

function dedupe(item, index, arr) {
  return arr.indexOf(item) === index;
}

tagRoom(opts.uri, opts.tags, {
  keepOriginal: opts['keep-original']
});

function addTag(room, tags, opts) {
  opts = opts || {};
  if (!room) throw new Error('Room not found.');

  var preExistingTags = [];
  if (opts.keepOriginal) {
    preExistingTags = preExistingTags.concat(room.tags || []);
  }
  room.tags = preExistingTags.concat(tags).filter(dedupe);
  return room.save();
}

function tagRoom(uri, tags, opts) {
  opts = opts || {};
  console.log('tagging', uri, '...');

  troupeService
    .findByUri(uri)
    .then(function(room) {
      return addTag(room, tags, opts);
    })
    // eslint-disable-next-line no-unused-vars
    .then(function(room) {
      console.log('done.');
      process.exit();
    })
    .catch(function(err) {
      console.log(err, err.stack);
      process.exit(1);
    });
}
