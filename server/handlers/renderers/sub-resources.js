'use strict';

var cdn = require('gitter-web-cdn');

function cdnSubResources(resources, jsRoot) {
  var resourceList = [];
  if (resources) {
    resourceList = resourceList.concat(resources);
  }

  return resourceList
    .map(function(f) {
      return cdn(jsRoot + '/' + f + '.js');
    })
    .concat(cdn('fonts/sourcesans/SourceSansPro-Regular.otf.woff'));
}

var SUBRESOURCE_MAPPINGS = {};

var CACHED_SUBRESOURCES = Object.keys(SUBRESOURCE_MAPPINGS).reduce(function(memo, key) {
  memo[key] = cdnSubResources(SUBRESOURCE_MAPPINGS[key], 'js');
  return memo;
}, {});

function getSubResources(entryPoint, jsRoot) {
  if (!jsRoot) {
    return CACHED_SUBRESOURCES[entryPoint];
  }

  return cdnSubResources(SUBRESOURCE_MAPPINGS[entryPoint], jsRoot);
}

module.exports = getSubResources;
