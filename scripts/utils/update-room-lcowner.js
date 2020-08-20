#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var shutdown = require('shutdown');
var BatchStream = require('batch-stream');
var Promise = require('bluebird');

// @const
var BATCH_SIZE = 20;
var QUERY_LIMIT = 0;

// progress logging stuff
var PROCESSED = 0;
var UPDATED = 0;
var CALLED_RUN = 0;

var batchComplete;
var running;

var batch = new BatchStream({ size: BATCH_SIZE });

var stream = persistence.Troupe.find({
  $or: [{ lcOwner: { $exists: false } }, { lcOwner: '' }, { lcOwner: null }]
})
  .limit(QUERY_LIMIT)
  .stream();

stream.pipe(batch);

stream.on('error', function(err) {
  console.log('err.stack:', err.stack);
});

batch.on('data', function(rooms) {
  running = true;
  this.pause(); // pause the stream
  run(rooms)
    .then(this.resume.bind(this)) // resume the stream on done
    .then(function() {
      running = false;
      if (batchComplete) {
        s();
      }
    })
    .done();
});

function s() {
  setTimeout(function() {
    logProgress();
    console.log('[FINISHED]\tquitting...');
    shutdown.shutdownGracefully();
  }, 1000);
}

batch.on('end', function() {
  if (!running) s();
  batchComplete = true;
});

var updateOwner = function(rooms) {
  return Promise.all(
    rooms.map(function(room) {
      console.log('room: ', room.uri, room.githubType);
      room.lcOwner = room.uri ? room.uri.split('/')[0].toLowerCase() : null;
      return room;
    })
  );
};

// iterates to the rooms and saves them
var saveRooms = function(rooms) {
  return Promise.all(
    rooms.map(function(room) {
      return (
        room
          .save()
          .then(function() {
            UPDATED += 1;
          })
          // FIXME: Don't swallow an error
          // eslint-disable-next-line no-unused-vars
          .catch(function(err) {
            return null;
          })
      );
    })
  );
};

// purely for logging
function logProgress() {
  console.log('[PROGRESS]', '\tprocessed:', PROCESSED, '\tupdated:', UPDATED);
}

// responsible for running the procedure
function run(rooms) {
  // increment stuff
  CALLED_RUN += 1;
  PROCESSED += rooms.length;

  if (CALLED_RUN % (BATCH_SIZE * 5) === 0) logProgress();

  return updateOwner(rooms)
    .then(saveRooms)
    .catch(function(err) {
      if (err.statusCode !== 404) console.error(err.stack);
    });
}
