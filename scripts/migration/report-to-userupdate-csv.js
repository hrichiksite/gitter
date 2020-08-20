#!/usr/bin/env node

'use strict';

var JSONStream = require('JSONStream');
var es = require('event-stream');
var fs = require('fs');
var csv = require('fast-csv');

var opts = require('yargs')
  .option('input', {
    required: true,
    description: 'where to find the json report file'
  })
  .option('output', {
    required: true,
    description: 'where to write the csv file'
  })
  .help('help')
  .alias('help', 'h').argv;

var csvStream = csv.createWriteStream({ headers: true });
var writableStream = fs.createWriteStream(opts.output);

var t = es.through(function write(data) {
  data.forEach(function(update) {
    if (update.type === 'rename-user') {
      this.emit('data', update);
    }
  }, this);
});

fs.createReadStream(opts.input)
  .pipe(JSONStream.parse('updates'))
  .pipe(t)
  .pipe(csvStream)
  .pipe(writableStream);
