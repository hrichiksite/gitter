'use strict';

var _ = require('lodash');

var slugify = function(str) {
  return str
    .toLowerCase()
    .replace(/ +/g, '-')
    .replace(/[^-\w]/g, '');
};

var FAUX_KEY_TAG_MAP_KEY_PREFIX = 'faux';
var FAUX_KEY_TAG_PREFIX = 'curated';

var SUGGESTED_TAG_LABEL = 'Suggested';
var SUGGESTED_BACKEND_TAG = 'generated:suggested';

// Given a simple faux map from readable label to array of tags,
// generate lookup-able map we can do work with
var generateTagMap = function(fauxTagMap) {
  // Generate the tagMap
  var tagMap = {};
  Object.keys(fauxTagMap).forEach(function(fauxKey) {
    // The tags driving the faux-tag
    var backendTags = [].concat(fauxTagMap[fauxKey]);
    // Convert the readable-label into a curated tag which will be used as the
    // primary backend tag to reach this entry (used in the URLs)
    backendTags.unshift(FAUX_KEY_TAG_PREFIX + ':' + slugify(fauxKey));

    tagMap[FAUX_KEY_TAG_MAP_KEY_PREFIX + ':' + slugify(fauxKey)] = {
      name: fauxKey,
      tags: backendTags
    };
  });

  return tagMap;
};

// Returns only the entries in the `tagMap` that were matched with `selectedTags`
var getSelectedEntriesInTagMap = function(tagMap, selectedTags) {
  tagMap = tagMap || {};
  selectedTags = [].concat(selectedTags);

  // Work out the selection
  var selectedTagMap = {};
  selectedTags.forEach(function(selectedTag) {
    var tagPortionMatches = selectedTag.match(/((?:(?:.*?):){0,})(.*)$/);
    var tagReservedPrefixPortion = tagPortionMatches[1];
    var tagMainPortion = tagPortionMatches[2];
    var key = slugify(tagMainPortion);

    // Only match to faux keys if we are using some special sauce or
    // the special `explore/tags/suggested` url
    var shouldMatchFauxKey = tagReservedPrefixPortion.length > 0 || tagMainPortion === 'suggested';

    var fauxKey = FAUX_KEY_TAG_MAP_KEY_PREFIX + ':' + key;
    var tagEntry = tagMap[fauxKey];
    if (shouldMatchFauxKey && tagEntry) {
      var newTagEntry = _.extend({}, tagEntry, {
        selected: true
      });
      selectedTagMap[fauxKey] = newTagEntry;
    } else {
      var newEntry = {
        name: selectedTag,
        tags: [selectedTag],
        selected: true
      };

      selectedTagMap[key] = newEntry;
    }
  });

  return selectedTagMap;
};

var generateSelectedTagMap = function(tagMap, selectedTags) {
  tagMap = tagMap || {};
  selectedTags = [].concat(selectedTags);

  // Work out the selection
  var selectedTagMap = getSelectedEntriesInTagMap(tagMap, selectedTags);

  // Copy the rest of the entries onto the selectedTagMap
  Object.keys(tagMap).forEach(function(key) {
    selectedTagMap[key] = selectedTagMap[key] || _.extend({}, tagMap[key]);
  });

  return selectedTagMap;
};

module.exports = {
  generateTagMap: generateTagMap,
  generateSelectedTagMap: generateSelectedTagMap,
  getSelectedEntriesInTagMap: getSelectedEntriesInTagMap,

  tagConstants: {
    FAUX_KEY_TAG_MAP_KEY_PREFIX: FAUX_KEY_TAG_MAP_KEY_PREFIX,
    FAUX_KEY_TAG_PREFIX: FAUX_KEY_TAG_PREFIX,

    SUGGESTED_TAG_LABEL: SUGGESTED_TAG_LABEL,
    SUGGESTED_BACKEND_TAG: SUGGESTED_BACKEND_TAG
  }
};
