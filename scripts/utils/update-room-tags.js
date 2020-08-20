#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var GitHubService = require('../../modules/github/lib/github-repo-service');
var shutdown = require('shutdown');
var BatchStream = require('batch-stream');
var Promise = require('bluebird');

var roomTagger = require('../../server/utils/room-tagger');

// @const
var BATCH_SIZE = 20;
var QUERY_LIMIT = 0;

// progress logging stuff
var PROCESSED = 0;
var TAGGED = 0;
var CALLED_RUN = 0;

var batchComplete;
var running;

var batch = new BatchStream({ size: BATCH_SIZE });

var stream = persistence.Troupe.find({
  users: { $not: { $size: 0 } },
  tags: { $exists: false },
  security: 'PUBLIC'
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

var fetchGithubInfo = function(uri, user) {
  var github = new GitHubService(user);
  return github.getRepo(uri);
};

var attachRepoInfoForRepoRoom = function(room) {
  return persistence.User.findById(room.users[0].id)
    .exec()
    .then(function(user) {
      return fetchGithubInfo(room.uri, user);
    })
    .then(function(repo) {
      if (!repo) {
        return null;
      }
      return {
        room: room,
        repo: repo
      };
    })
    .catch(function(err) {
      if (err.statusCode !== 404) {
        console.error(err.stack);
      }
      return null;
    });
};

var attachRepoInfoToRooms = function(rooms) {
  return Promise.all(
    rooms.map(function(room) {
      if (room.githubType === 'REPO') {
        return attachRepoInfoForRepoRoom(room);
      } else {
        return { room: room };
      }
    })
  );
};

var filterFailedRooms = function(roomContainers) {
  var newRoomContainers = roomContainers.filter(function(roomContainer) {
    return !!roomContainer;
  });

  var failedGithubFetch = roomContainers.length - newRoomContainers.length;
  if (failedGithubFetch > 0)
    console.log('rooms that failed to get github data:', failedGithubFetch);

  return newRoomContainers;
};

// deals with { room: room, repo:repo } returning an array of rooms with the added tags
var tagRooms = function(roomContainers) {
  return roomContainers.map(function(roomContainer) {
    var room = roomContainer.room;
    var repo = roomContainer.repo;
    room.tags = roomTagger(room, repo); // tagging
    return room;
  });
};

// iterates to the now tagged rooms and saves them
var saveRooms = function(rooms) {
  return Promise.all(
    rooms.map(function(room) {
      return (
        room
          .save()
          .then(function() {
            TAGGED += 1;
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
  console.log('[PROGRESS]', '\tprocessed:', PROCESSED, '\ttagged:', TAGGED);
}

// responsible for running the procedure
function run(rooms) {
  // increment stuff
  CALLED_RUN += 1;
  PROCESSED += rooms.length;

  if (CALLED_RUN % (BATCH_SIZE * 5) === 0) logProgress();

  return attachRepoInfoToRooms(rooms)
    .then(filterFailedRooms)
    .then(tagRooms)
    .then(saveRooms)
    .catch(function(err) {
      if (err.statusCode !== 404) console.error(err.stack);
    });
}
