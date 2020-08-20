#!/usr/bin/env node
'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var shutdown = require('shutdown');
var BatchStream = require('batch-stream');
var processText = require('gitter-web-text-processor');

// @const
var BATCH_SIZE = 200;

// progress logging stuff
var totalProcessed = 0;
var success = 0;
var runCalled = 0;

var batchComplete;
var running;

var batch = new BatchStream({ size: BATCH_SIZE });

var stream = persistence.ChatMessage.find({
  $or: [
    {
      lang: null
    },
    {
      lang: { $exists: false }
    }
  ]
})
  .select('text')
  .stream();

stream.pipe(batch);

stream.on('error', function(err) {
  console.log('err.stack:', err.stack);
});

batch.on('data', function(chatMessages) {
  var self = this;

  running = true;
  this.pause(); // pause the stream
  run(chatMessages)
    .then(function() {
      self.resume(); // Resume
      running = false;
      if (batchComplete) {
        batchProcessingComplete();
      }
    })
    .done();
});

function batchProcessingComplete() {
  return Promise.delay(1000).then(function() {
    logProgress();
    console.log('[FINISHED]\tquitting...');
    shutdown.shutdownGracefully();
  });
}

batch.on('end', function() {
  if (!running) batchProcessingComplete();
  batchComplete = true;
});

// purely for logging
function logProgress() {
  console.log('[PROGRESS]', '\tprocessed:', totalProcessed, '\tsuccess:', success);
}

// responsible for running the procedure
function run(chatMessages) {
  // increment stuff
  runCalled += 1;
  totalProcessed += chatMessages.length;

  if (runCalled % BATCH_SIZE === 0) logProgress();

  return Promise.all(
    chatMessages.map(function(chat) {
      return processText(chat.text)
        .then(function(result) {
          totalProcessed += 1;
          if (totalProcessed % 1000 === 0) {
            logProgress();
          }
          if (result.lang) {
            return persistence.ChatMessage.findByIdAndUpdate(chat.id, {
              $set: { lang: result.lang }
            })
              .exec()
              .then(function() {
                success++;
              });
          }
        })
        .catch(function(err) {
          console.error(err.stack);
        });
    })
  );
}
