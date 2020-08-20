'use strict';

var speedy = require('speedy');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');

// var troupeId = "54e4bffbf551ca5918c16c29";
var troupeId = '54d244f1c53660e29b9f91d9';

onMongoConnect(function() {
  speedy.run({
    withSelect: function(done) {
      troupeService.findUserIdsForTroupe(troupeId).nodeify(done);
    },
    withLimit: function(done) {
      troupeService
        .findUsersForTroupeWithLimit(troupeId, 25)
        // .then(function(f) {
        //   console.log(f.length);
        // })
        // .catch(function(e) {
        //   console.log(e);
        // })
        .nodeify(done);
    }
  });
});
