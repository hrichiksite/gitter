'use strict';

const debug = require('debug')('gitter:infra:serializer:gitlab-project');

function GitlabProjectStrategy(/*options*/) {
  this.preload = function(/*projects*/) {};

  this.map = function(item) {
    debug('map', item);
    return {
      type: 'GL_PROJECT',
      id: item.id,
      name: item.name,
      description: item.description,
      absoluteUri: item.absoluteUri,
      uri: item.uri,
      private: item.private,
      avatar_url: item.avatar_url
    };
  };
}

GitlabProjectStrategy.prototype = {
  name: 'GitlabProjectStrategy'
};

module.exports = GitlabProjectStrategy;
