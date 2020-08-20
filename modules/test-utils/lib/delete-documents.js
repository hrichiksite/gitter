'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');

function deleteDocuments(expected) {
  var d = expected.deleteDocuments;
  if (!d) return;

  // This *REALLY* mustn't get run in the wrong environments
  if (process.env.NODE_ENV === 'beta' || process.env.NODE_ENV === 'prod') {
    throw new Error('https://cdn.meme.am/instances/400x/52869867.jpg');
  }

  return Promise.map(Object.keys(d), function(key) {
    var queries = d[key];
    return Promise.map(queries, function(query) {
      return persistence[key].remove(query).exec();
    });
  });
}

module.exports = deleteDocuments;
