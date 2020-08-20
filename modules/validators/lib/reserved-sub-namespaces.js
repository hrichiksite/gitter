'use strict';

// These are second-level namespaces, so used to validate things like room uris
// that live underneath groups or users. ie. /:groupUri/topics

var namespaces = ['topics', 'archive', 'archives', 'integration', 'integrations', 'home'];

module.exports = {
  list: namespaces,
  hash: namespaces.reduce(function(memo, name) {
    memo[name.toLowerCase()] = true;
    return memo;
  }, {})
};
