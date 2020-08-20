'use strict';

const debug = require('debug')('gitter:infra:serializer:gitlab-group');

function GitlabGroupStrategy(/*options*/) {
  this.preload = function(/*groups*/) {};

  this.map = function(item) {
    debug('map', item);
    return {
      type: 'GL_GROUP',
      id: item.id,
      name: item.name,
      avatar_url: item.avatar_url,
      uri: item.uri,
      absoluteUri: item.absoluteUri
    };
  };
}

GitlabGroupStrategy.prototype = {
  name: 'GitlabGroupStrategy'
};

module.exports = GitlabGroupStrategy;
