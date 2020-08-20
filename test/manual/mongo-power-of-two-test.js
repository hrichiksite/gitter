'use strict';

var speedy = require('speedy');
var mongoose = require('gitter-web-mongoose-bluebird');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var async = require('async');

// speedy.samples(10);
speedy.timeout(5000);

onMongoConnect(function() {
  var db = mongoose.connection.db;

  var col1 = db.collection('col1');
  var col2 = db.collection('col2');

  async.times(
    1000,
    function(n, next) {
      col1.insert({ moo: n }, next);
    },
    function(err) {
      if (err) throw err;

      async.times(
        1000,
        function(n, next) {
          col2.insert({ moo: n }, next);
        },
        function(err) {
          if (err) throw err;

          db.command({ collMod: 'col1', usePowerOf2Sizes: true }, function(err) {
            if (err) throw err;

            db.command({ collMod: 'col2', usePowerOf2Sizes: false }, function(err) {
              if (err) throw err;

              speedy.run({
                withPowerOfTwo: function(done) {
                  var i = Math.floor(Math.random() * 1000);
                  col1.update({ moo: i }, { $pushAll: { bob: [new Date()] } }, done);
                },
                withoutPowerOfTwo: function(done) {
                  var i = Math.floor(Math.random() * 1000);
                  col2.update({ moo: i }, { $pushAll: { bob: [new Date()] } }, done);
                }
              });
            });
          });
        }
      );
    }
  );
});
