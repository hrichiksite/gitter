'use strict';

var validateDisplayName = require('./validate-display-name');

// TODO: decide on a sane value here.
var MAX_TAGS = 100;

function validateTags(tags, allowedTags) {
  if (!tags) return true;

  if (tags.length > MAX_TAGS) {
    return false;
  }

  // optional: pass in a list of allowed tags
  var allowedMap;
  if (allowedTags) {
    allowedMap = allowedTags.reduce(function(memo, tag) {
      memo[tag] = true;
      return memo;
    }, {});
  }

  var usedTags = {};

  return tags.every(function(tag) {
    if (!validateDisplayName(tag)) {
      return false;
    }

    // optional: check if the tag is in the allowed list
    if (allowedMap && !allowedMap[tag]) {
      return false;
    }

    // check for duplicates
    var lcTag = tag.toLowerCase();
    if (usedTags[lcTag]) {
      return false;
    }
    usedTags[lcTag] = true;

    return true;
  });
}

module.exports = validateTags;
