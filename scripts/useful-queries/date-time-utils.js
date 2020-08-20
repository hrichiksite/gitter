'use strict';

function createIdForTimestampString(timestamp) {
  var hexSeconds = Math.floor(timestamp / 1000).toString(16);

  while (hexSeconds.length < 8) {
    hexSeconds = '0' + hexSeconds;
  }
  return hexSeconds + '0000000000000000';
}

function createIdForTimestamp(timestamp) {
  return ObjectId(createIdForTimestampString(timestamp));
}

/**
 * Returns Date with start of the current month. This date can be shifted by `addMonths` months
 * @param {Number} addMonths (can be negative) how many months should be added/subtracted to the start of the current month
 */
function startOfUtcMonth(addMonths) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + addMonths, 1));
}
