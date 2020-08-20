#!/usr/bin/env node
'use strict' /* messy messy @lerouxb */;

/* eslint-disable */ var path = require('path');
var yargs = require('yargs');
var fs = require('fs');
var es = require('event-stream');
var through2 = require('through2');
var shutdown = require('shutdown');
var mongoose = require('mongoose');
var persistence = require('gitter-web-persistence');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var installMigrationSchemas = require('./migration-schemas').install;

var migrationSchemas;

var opts = yargs
  .option('schema', {
    required: true,
    description: 'users or orgs'
  })
  .option('filename', {
    required: true,
    description: 'csv file to read in'
  })
  .option('since', {
    default: 0,
    description: 'only ids > since'
  })
  .number('since')
  .help('help')
  .alias('help', 'h').argv;

function processBatch(lines, enc, cb) {
  var schema;
  if (opts.schema == 'users') {
    console.log('importing users');
    schema = migrationSchemas.GitHubUser;
  }
  if (opts.schema == 'orgs') {
    console.log('importing orgs');
    schema = migrationSchemas.GitHubOrg;
  }

  var bulk = schema.collection.initializeUnorderedBulkOp();
  var numOperations = 0;
  lines.forEach(function(line) {
    var parts = line.split(',');
    var githubId = parseInt(parts[1], 10);
    if (!opts.since || githubId > opts.since) {
      numOperations++;
      bulk.insert({
        uri: parts[0],
        lcUri: parts[0].toLowerCase(),
        githubId: githubId
      });
    }
  });
  if (numOperations) {
    bulk.execute(function(err) {
      if (err) {
        console.error(err.message);
      } else {
        console.log('.');
      }
      // boo :(
      console.log(process.memoryUsage());
      cb();
    });
  } else {
    cb();
  }
}

var batchLines = [];
function processOne(line, enc, cb) {
  batchLines.push(line);
  if (batchLines.length == 1000) {
    processBatch(batchLines, enc, cb);
    batchLines = [];
  } else {
    cb();
  }
}

console.log('connecting...');
onMongoConnect()
  .then(function() {
    console.log('installing migration schemas');
    migrationSchemas = installMigrationSchemas(mongoose.connection);
    var s = fs
      .createReadStream(opts.filename)
      .pipe(es.split())
      .pipe(through2.obj(processOne))
      .on('error', function(err) {
        console.error(err);
        console.error(err.stack);
        process.exit(1);
      })
      .on('end', function() {
        shutdown.shutdownGracefully();
      });
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
  });
