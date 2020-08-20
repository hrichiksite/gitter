'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var config = env.config;
var Promise = require('bluebird');
var client = require('./elasticsearch-client');
var debug = require('debug')('gitter:app:elasticsearch:chats-for-room-search');

const DEFAULT_QUERY_TIMEOUT = parseInt(config.get('elasticsearch:defaultQueryTimeout'), 10) || 500;

/* Magic way of figuring out the matching terms so that we can highlight */
function extractHighlights(text) {
  if (!text) return [];
  var results = [];
  text.forEach(function(t) {
    var re = /<m(\d)>(.*?)<\/m\1>/g;
    var match;
    while ((match = re.exec(t)) !== null) {
      results[match[1]] = match[2];
    }
  });

  return results.filter(function(f) {
    return !!f;
  });
}

function getElasticSearchQuery(troupeId, parsedQuery) {
  var query = {
    bool: {
      must: [
        {
          term: { toTroupeId: String(troupeId) }
        }
      ],
      should: []
    }
  };

  if (parsedQuery.fromUser) {
    query.bool.must.push({
      has_parent: {
        parent_type: 'user',
        query: {
          query_string: {
            query: parsedQuery.fromUser,
            default_operator: 'AND'
          }
        }
      }
    });
  }

  if (parsedQuery.queryString) {
    parsedQuery.analyzers.forEach(function(analyzer) {
      query.bool.should.push({
        query_string: {
          default_field: 'text',
          query: parsedQuery.queryString,
          analyzer: analyzer,
          default_operator: 'AND'
        }
      });
    });

    query.bool.minimum_should_match = 1;
  }

  return query;
}

function searchRoom(troupeId, parsedQuery, options) {
  var query = getElasticSearchQuery(troupeId, parsedQuery);

  var queryRequest = {
    size: options.limit || 10,
    from: options.skip,
    timeout: DEFAULT_QUERY_TIMEOUT,
    index: 'gitter-primary',
    type: 'chat',
    body: {
      fields: ['_id'],
      query: query,
      highlight: {
        order: 'score',
        pre_tags: ['<m0>', '<m1>', '<m2>', '<m3>', '<m4>', '<m5>'],
        post_tags: ['</m0>', '</m1>', '</m2>', '</m3>', '</m4>', '</m5>'],
        fields: {
          text: {
            matched_fields: ['text'],
            type: 'fvh'
          }
        }
      },
      sort: [{ _score: { order: 'desc' } }, { sent: { order: 'desc' } }]
    }
  };

  var startTime = Date.now();
  debug('Query: %j', queryRequest);
  return client
    .search(queryRequest)
    .then(function(response) {
      debug('Response: %j', response);
      stats.responseTime('chat.search.exec', Date.now() - startTime);

      return response.hits.hits.map(function(hit) {
        return {
          id: hit._id,
          highlights: hit.highlight && extractHighlights(hit.highlight.text)
        };
      });
    })
    .catch(function(err) {
      stats.event('chat.search.error');
      throw err;
    });
}

module.exports = {
  searchRoom: Promise.method(searchRoom)
};
