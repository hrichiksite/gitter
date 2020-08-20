'use strict';

var _ = require('lodash');
var restSerializer = require('../../serializers/rest-serializer');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var exploreTagUtils = require('../../utils/explore-tag-utils');

var defaults = {
  isLoggedIn: false,
  fauxTagMap: {},
  selectedTags: [],
  rooms: []
};

module.exports = function getSnapshotsForPageContext(options) {
  var opts = _.extend({}, defaults, options);

  var tagMap = exploreTagUtils.generateTagMap(opts.fauxTagMap);
  if (!opts.isLoggedIn) {
    tagMap[
      exploreTagUtils.tagConstants.FAUX_KEY_TAG_MAP_KEY_PREFIX + ':suggested'
    ].needsAuthentication = true;
  }
  var selectedTagMap = exploreTagUtils.generateSelectedTagMap(tagMap, opts.selectedTags);

  var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
  return restSerializer.serialize(opts.rooms, strategy).then(function(rooms) {
    var resultantRooms = rooms.map(function(roomObj) {
      return generateRoomCardContext(roomObj);
    });

    return {
      tagMap: selectedTagMap,
      rooms: resultantRooms
    };
  });
};
