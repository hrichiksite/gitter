#!/usr/bin/env node

'use strict';

require('gitter-web-persistence');
var mongoose = require('mongoose');

function die(stage, error) {
  console.error('DB connection failed during ' + stage);
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}

try {
  console.log('Connecting to database');

  var db = mongoose.connection.db;
  var adminDb = db.admin();

  mongoose.connection.on('open', function() {
    adminDb.ping(function(err, pingResult) {
      if (err) return die('ping', err);
      if (
        !pingResult ||
        !pingResult.documents ||
        !pingResult.documents.length ||
        !pingResult.documents[0] ||
        !pingResult.documents[0].ok
      )
        return die('ping', 'ping fail');

      adminDb.replSetGetStatus(function(err, info) {
        if (err) return die('repl', err);
        if (!info || info.myState !== 1) return die('repl', 'replica set fail');

        var pingtestCollection = db.collection('pingtest');
        pingtestCollection.insert({ ping: Date.now() }, function(err) {
          if (err) return die('insert', err);

          pingtestCollection.remove({}, function(err) {
            if (err) return die('remove', err);

            process.exit(0);
          });
        });
      });
    });
  });
} catch (e) {
  die('ping', e);
}
