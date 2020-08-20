'use strict';

var persistence = require('gitter-web-persistence');
var cacheWrapper = require('gitter-web-cache-wrapper');

/**
 * fetchByTags() retrives rooms that match a given set of tags
 *
 * tags     Array the querying tags
 * @return  Promise promise of matching rooms
 */
function fetchByTags(tags) {
  // limit by 8 tags to avoid mega queries
  tags = tags.slice(0, 8);

  return persistence.Troupe.find({
    'sd.public': true,
    tags: {
      $in: tags
    }
  })
    .sort({ userCount: -1 })
    .limit(50)
    .exec();
}

exports.fetchByTags = fetchByTags;

exports.fetchByTagsCached = cacheWrapper('fetchByTagsCached', fetchByTags);
