'use strict';

var persistence = require('gitter-web-persistence');
var es = require('event-stream');
var csv = require('fast-csv');

module.exports = function userStream() {
  return persistence.User.find({})
    .lean()
    .select('username')
    .stream()
    .pipe(
      es.map(function(user, callback) {
        callback(null, {
          userId: '' + user._id,
          username: user.username
        });
      })
    )
    .pipe(csv.createWriteStream({ headers: true }));
};
