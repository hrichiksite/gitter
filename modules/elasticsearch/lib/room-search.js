'use strict';

var config = require('gitter-web-env').config;
var Promise = require('bluebird');
var client = require('./elasticsearch-client');
var _ = require('lodash');

const DEFAULT_QUERY_TIMEOUT = parseInt(config.get('elasticsearch:defaultQueryTimeout'), 10) || 500;

var PUBLIC_ROOMS_QUERY = {
  nested: {
    path: 'sd',
    query: {
      term: {
        'sd.public': true
      }
    }
  }
};

function privateRooms(privateRoomIds) {
  return {
    ids: {
      type: 'room',
      values: privateRoomIds
    }
  };
}

function or() {
  var terms = Array.prototype.slice.call(arguments);
  return {
    bool: {
      should: terms,
      minimum_should_match: 1
    }
  };
}

function and() {
  var terms = Array.prototype.slice.call(arguments);
  return {
    bool: {
      must: terms
    }
  };
}

function searchRooms(queryText, userId, privateRoomIds, options) {
  options = _.defaults(options, { limit: 5 });

  var queryTextEscaped = queryText.replace(/([^\s]+\/([^\s]+(\/[^\s]+)?)?)/g, '"$1"');

  var queryTerms = or(
    {
      prefix: {
        uri: {
          value: queryText
        }
      }
    },
    {
      query_string: {
        query: queryTextEscaped,
        default_operator: 'AND',
        lenient: true
      }
    }
  );

  var roomRestrictionTerms = or(PUBLIC_ROOMS_QUERY, privateRooms(privateRoomIds));

  var queryRequest = {
    from: options.skip || 0,
    size: options.limit || 10,
    timeout: DEFAULT_QUERY_TIMEOUT,
    index: 'gitter-primary',
    type: 'room',
    body: {
      fields: ['_id'],
      query: {
        function_score: {
          query: and(queryTerms, roomRestrictionTerms),
          functions: [
            {
              field_value_factor: {
                field: 'userCount',
                factor: 1.2,
                modifier: 'sqrt'
              }
            }
          ]
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

module.exports = {
  searchRooms: Promise.method(searchRooms)
};
