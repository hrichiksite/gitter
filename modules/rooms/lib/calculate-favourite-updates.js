'use strict';

const _ = require('underscore');

// roomId: The roomId that was updated
// favouritePosition: The new favourite position value for the room that was updated
// roomIdFavouritePositionPairs: [ [ '5ae75c46d9664fd8a954ea00', 19 ], [ '5bc06a50d850640967290b2f', 21 ] ]
function calculateFavouriteUpdates(roomId, favouritePosition, roomIdFavouritePositionPairs) {
  const values = roomIdFavouritePositionPairs
    .filter(function(a) {
      return _.isNumber(a[1]) && a[1] >= favouritePosition && a[0] !== roomId;
    })
    .sort(function(a, b) {
      return a[1] - b[1];
    });

  var next = favouritePosition;
  // NB: used to be i = 1
  for (var i = 0; i < values.length; i++) {
    var item = values[i];

    if (item[1] > next) {
      /* Only increment those values before this one */
      values.splice(i, values.length);
      break;
    }
    /* This dude needs an increment */
    item[1]++;
    next = item[1];
  }

  return values;
}

module.exports = calculateFavouriteUpdates;
