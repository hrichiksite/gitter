'use strict';

var Promise = require('bluebird');
var client = require('./elasticsearch-client');
var applyStandardQueryOptions = require('./apply-standard-query-options');

function searchChatsForUserId(userId, options) {
  var queryRequest = {
    index: 'gitter-primary',
    type: 'chat',
    body: {
      query: {
        bool: {
          must: [
            {
              term: {
                fromUserId: userId
              }
            }
          ],
          must_not: [],
          should: []
        }
      }
    }
  };

  applyStandardQueryOptions(queryRequest, options);

  return client.search(queryRequest);
}

module.exports = {
  searchChatsForUserId: Promise.method(searchChatsForUserId)
};
