#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var through2Concurrent = require('through2-concurrent');
var BatchStream = require('batch-stream');
var Promise = require('bluebird');

function anonymousTokenStream() {
  return persistence.OAuthAccessToken.find({ userId: null }, { _id: 1 })
    .read('secondary')
    .lean()
    .stream();
}

function removeTokensByIds(ids) {
  var bulk = persistence.OAuthAccessToken.collection.initializeUnorderedBulkOp();
  ids.forEach(function(id) {
    bulk.find({ _id: id }).removeOne();
  });

  return Promise.fromCallback(function(callback) {
    bulk.execute(callback);
  });
}

function performDeletion() {
  return new Promise(function(resolve) {
    var count = 0;
    anonymousTokenStream()
      .pipe(new BatchStream({ size: 1000 }))
      .pipe(
        through2Concurrent.obj({ maxConcurrency: 1 }, function(docs, enc, callback) {
          var ids = docs.map(function(d) {
            return d._id;
          });

          var start = Date.now();

          return removeTokensByIds(ids)
            .then(function() {
              var timePerDocument = docs.length / (Date.now() - start + 1000);
              var estimated = 19e6 / timePerDocument;
              console.log('Estimated time is ', Math.round(estimated / 60000), 'minutes');
            })
            .delay(1000)
            .nodeify(callback);
        })
      )
      .on('data', function() {
        count++;
        if (count % 100 === 0) {
          console.log('Completed ', count);
        }
      })
      .on('end', function() {
        console.log('DONE');
        resolve();
      });
  });
}

onMongoConnect()
  .then(function() {
    return performDeletion();
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .catch(function(err) {
    console.error(err.stack);
    process.exit(1);
  })
  .done();
