'use strict';

var persistence = require('gitter-web-persistence');
var es = require('event-stream');
var csv = require('fast-csv');

module.exports = function() {
  return persistence.TroupeUser.find()
    .lean()
    .select('userId troupeId')
    .slaveOk()
    .stream()
    .pipe(
      es.through(function(roomMembership) {
        this.emit('data', {
          roomId: '' + roomMembership.troupeId,
          userId: '' + roomMembership.userId
        });
      })
    )
    .pipe(csv.createWriteStream({ headers: true }));
};
