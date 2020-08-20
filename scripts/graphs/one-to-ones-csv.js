'use strict';

var persistence = require('gitter-web-persistence');
var shutdown = require('shutdown');
var es = require('event-stream');
var csv = require('fast-csv');
var fs = require('fs');

persistence.Troupe.find({ oneToOne: true })
  .lean()
  .select('users')
  .slaveOk()
  .stream()
  .pipe(
    es.map(function(room, callback) {
      if (room.users.length !== 2) return callback();

      callback(null, {
        userA: '' + room.users[0].userId,
        userB: '' + room.users[1].userId
      });
    })
  )
  .on('end', function() {
    setTimeout(function() {
      shutdown.shutdownGracefully();
    }, 10000);
  })
  .pipe(csv.createWriteStream({ headers: true }))
  .pipe(fs.createWriteStream('one-to-ones.csv'));
