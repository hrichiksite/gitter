#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var persistence = require('gitter-web-persistence');
var BatchStream = require('batch-stream');
var through2Concurrent = require('through2-concurrent');

var stream = persistence.Troupe.find(
  {
    tags: { $exists: true, $ne: [] }
  },
  { tags: 1 }
)
  .lean()
  .slaveOk()
  .stream();

var batchNum = 0;
var tags = {};
var pipe = stream.pipe(new BatchStream({ size: 100 })).pipe(
  through2Concurrent.obj({ maxConcurrency: 10 }, function(batch, enc, cb) {
    batchNum++;
    if (batchNum % 10 === 0) {
      console.log(batchNum * 100);
    }

    batch.forEach(function(room) {
      room.tags.forEach(function(tag) {
        if (tags[tag]) {
          tags[tag]++;
        } else {
          tags[tag] = 1;
        }
      });
    });

    cb();
  })
);

pipe.on('data', function() {});

pipe.on('end', function() {
  var popular = _(tags)
    .chain()
    .pairs()
    .filter(function(pair) {
      return pair[1] > 1;
    })
    .sortBy(function(pair) {
      return -pair[1];
    })
    .slice(0, 1000)
    .value();

  popular.forEach(function(pair) {
    console.log(pair[0] + ',' + pair[1]);
  });

  process.exit(0);
});

pipe.on('error', function(err) {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
