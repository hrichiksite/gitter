'use strict';

var persistence = require('gitter-web-persistence');
var es = require('event-stream');
var csv = require('fast-csv');

var ANTI_MONOPOLY_LOWER_THRESHOLD = 500;
var ANTI_MONOPOLY_UPPER_THRESHOLD = 3000;
var MIN_WEIGHT = 0.05;

/*
 * Returns the weighting like this graph so that we don't
 * get a horrible cliff that rooms will drop off suddenly
 * and gradually lower the ranking of rooms as they get
 * larger. A bit like tax rates.
 *
 *           1 -|------\
 *              |       \
 *              |        \
 *              |         \
 *              |          \
 *   MIN_WEIGHT-|           \------------
 *              |
 *             -+------------------------
 *                     |    |
 *                    LOW   UP
 */
function getWeightForUserCount(userCount) {
  if (userCount <= ANTI_MONOPOLY_LOWER_THRESHOLD) return 1;
  if (userCount > ANTI_MONOPOLY_UPPER_THRESHOLD) return MIN_WEIGHT;

  var p = userCount - ANTI_MONOPOLY_LOWER_THRESHOLD;
  var v =
    ((ANTI_MONOPOLY_UPPER_THRESHOLD - ANTI_MONOPOLY_LOWER_THRESHOLD - p) /
      (ANTI_MONOPOLY_UPPER_THRESHOLD - ANTI_MONOPOLY_LOWER_THRESHOLD)) *
    (1 - MIN_WEIGHT);
  return (v + MIN_WEIGHT).toFixed(2);
}

module.exports = function roomStream() {
  return persistence.Troupe.find({ oneToOne: { $ne: true } })
    .lean()
    .select('oneToOne githubType security uri userCount lcOwner lang')
    .stream()
    .pipe(
      es.map(function(room, callback) {
        var weight = getWeightForUserCount(room.userCount);
        callback(null, {
          roomId: '' + room._id,
          security: room.security,
          weight: weight,
          lcOwner: room.lcOwner,
          lang: room.lang || 'en'
        });
      })
    )
    .pipe(csv.createWriteStream({ headers: true }));
};
