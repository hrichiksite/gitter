'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var config = env.config;
var elasticsearch = require('elasticsearch');
var Promise = require('bluebird');
var debug = require('debug')('gitter:infra:elasticsearch');

function ElasticSearchLoggingAdapter(/*config*/) {}

ElasticSearchLoggingAdapter.prototype.error = function(error) {
  logger.error('es: error ' + error, { exception: error });
};

ElasticSearchLoggingAdapter.prototype.warning = function(message) {
  logger.warn('es: ' + message);
};

ElasticSearchLoggingAdapter.prototype.info = function(message) {
  debug('es: ' + message);
};

ElasticSearchLoggingAdapter.prototype.debug = function(message) {
  debug(message);
};

ElasticSearchLoggingAdapter.prototype.trace = function(
  method,
  requestUrl,
  body /*, responseBody, responseStatus*/
) {
  debug('trace: method=%s url=%s, body=%j', method, requestUrl && requestUrl.path, body);
};
ElasticSearchLoggingAdapter.prototype.close = function() {};

function defer() {
  var resolve, reject;
  var promise = new Promise(function() {
    resolve = arguments[0];
    reject = arguments[1];
  });
  return {
    resolve: resolve,
    reject: reject,
    promise: promise
  };
}

module.exports = new elasticsearch.Client({
  hosts: config.get('elasticsearchTypeahead:hosts'),
  // Warning: possible memory leak: https://github.com/elasticsearch/elasticsearch-js/issues/71
  sniffOnStart: config.get('elasticsearch:sniffOnStart'),
  sniffInterval: 300000,
  apiVersion: '2.3',
  defer: defer,
  log: ElasticSearchLoggingAdapter
});
