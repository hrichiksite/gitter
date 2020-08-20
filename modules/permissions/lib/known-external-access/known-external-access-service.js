'use strict';

const persistence = require('gitter-web-persistence');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const cursor = persistence.KnownExternalAccess.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

module.exports = {
  getCursorByUserId
};
