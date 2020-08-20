'use strict';

var Writable = require('stream').Writable;
var util = require('util');
var bulkTools = require('./elastic-bulk-tools');
var debug = require('debug')('gitter:app:elastic-bulk-update-stream');

function ElasticBulkUpdateStream(elasticClient) {
  this._elasticClient = elasticClient;
  Writable.call(this, { objectMode: true });
}

util.inherits(ElasticBulkUpdateStream, Writable);

// expects an array of updates where each element is a valid req for elasticClient.update
ElasticBulkUpdateStream.prototype._write = function(updates, encoding, callback) {
  debug('uploading %d updates', updates.length);
  var req = bulkTools.createBulkUpdate(updates);
  this._elasticClient.bulk(req, function(err, res) {
    return callback(err || bulkTools.findErrors(req, res));
  });
};

module.exports = ElasticBulkUpdateStream;
