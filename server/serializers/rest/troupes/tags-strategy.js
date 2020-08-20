'use strict';

function TagsStrategy() {}

TagsStrategy.prototype = {
  preload: function() {},
  map: function(room) {
    return room.tags || [];
  },
  name: 'TagsStrategy'
};

module.exports = TagsStrategy;
