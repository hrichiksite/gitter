'use strict';

var config = require('gitter-web-env').config;
var Promise = require('bluebird');
var client = require('./elasticsearch-client');

const DEFAULT_QUERY_TIMEOUT = parseInt(config.get('elasticsearch:defaultQueryTimeout'), 10) || 500;

function searchGlobalUsers(queryText, options) {
  var queryRequest = {
    size: options.limit || 10,
    timeout: DEFAULT_QUERY_TIMEOUT,
    index: 'gitter-primary',
    type: 'user',
    body: {
      fields: ['_id'],
      query: {
        query_string: {
          query: queryText,
          default_operator: 'AND'
        }
      },
      sort: [{ _score: { order: 'desc' } }]
    }
  };

  return client.search(queryRequest).then(function(response) {
    return response.hits.hits.map(function(hit) {
      return hit._id;
    });
  });
}

function elasticsearchUserTypeahead(queryText, options) {
  // Normal searches dont work well for typeaheads
  // e.g searching "maldito" normally wouldnt match malditogeek.
  // but phrase_prefix handles that.
  //
  // Completion Suggester is faster, but requires us to completely
  // reindex and supply a room context

  options = options || {};
  var limit = options.limit || 10;
  var userIds = options.userIds;

  var query = {
    multi_match: {
      query: queryText,
      type: 'phrase_prefix',
      fields: ['username', 'displayName']
    }
  };

  if (userIds) {
    query = {
      filtered: {
        filter: { ids: { values: userIds } },
        query: query
      }
    };
  }

  var queryRequest = {
    size: limit,
    timeout: DEFAULT_QUERY_TIMEOUT,
    index: 'gitter-primary',
    type: 'user',
    body: {
      fields: ['_id'],
      query: query,
      sort: [{ _score: { order: 'desc' } }]
    }
  };

  return client.search(queryRequest).then(function(response) {
    return response.hits.hits.map(function(hit) {
      return hit._id;
    });
  });
}

module.exports = {
  searchGlobalUsers: Promise.method(searchGlobalUsers),
  elasticsearchUserTypeahead: Promise.method(elasticsearchUserTypeahead)
};
