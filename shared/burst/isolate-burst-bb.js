'use strict';

var backboneAdapter = require('../backbone-adapter');
var isolateBurst = require('./isolate-burst');

module.exports = function(collection, model) {
  return isolateBurst(backboneAdapter, collection, model);
};
