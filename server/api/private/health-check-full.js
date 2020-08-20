/*jshint trailing: false, unused: true, node: true */
'use strict';

var os = require('os');
var appVersion = require('gitter-app-version');
var mongoose = require('mongoose');
var env = require('gitter-web-env');
var logger = env.logger;
var config = env.config;
var redis = env.redis;
var errorReporter = env.errorReporter;
var StatusError = require('statuserror');

module.exports = [
  function(req, res, next) {
    try {
      var db = mongoose.connection.db;
      var adminDb = db.admin();
      adminDb.ping(function(err, pingResult) {
        if (err) return next(err);

        if (!pingResult || !pingResult.ok) return next(new StatusError(500, 'Ping failed'));

        adminDb.replSetGetStatus(function(err, info) {
          if (err) return next(err);
          if (!info || info.myState !== 1) return next(new StatusError(500, 'Replica set failure'));

          var pingtestCollection = db.collection('pingtest');
          pingtestCollection.insert({ ping: Date.now() }, function(err) {
            if (err) return next(err);

            pingtestCollection.remove({}, function(err) {
              if (err) return next(err);

              var redisClient = redis.getClient();
              redisClient.incr('ping.test', function(err) {
                if (err) return next(err);

                res.send(
                  'OK from ' +
                    os.hostname() +
                    ':' +
                    config.get('PORT') +
                    ', running ' +
                    appVersion.getVersion()
                );
              });
            });
          });
        });
      });
    } catch (e) {
      next(e);
    }
  },
  function(err, req, res /*, next*/) {
    logger.error('Health check failed: ' + err, { exception: err });
    errorReporter(err, { health_check_full: 'failed' }, { module: 'health-check' });
    res.status(500).send('Failed: ' + err);
  }
];
