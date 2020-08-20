'use strict';

var LRU = require('lru-cache');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var _ = require('lodash');

function MongooseCachedLookup(options) {
  var model = options.model;
  var cache = LRU({
    max: options.max || 128,
    maxAge: options.maxAge || 60 * 1000 // 1 minute
  });

  this.get = function(id) {
    /* Ensure the ID is a string */
    id = mongoUtils.serializeObjectId(id);
    if (!id) return Promise.resolve();

    var cached = cache.get(id);
    if (cached) return Promise.resolve(_.clone(cached)); // Shallow clone only!

    return model
      .findById(id, undefined, { lean: true })
      .exec()
      .then(function(doc) {
        if (!doc) return;
        doc.id = mongoUtils.serializeObjectId(doc._id);
        cache.set(id, doc);
        return doc;
      });
  };
}

module.exports = MongooseCachedLookup;
