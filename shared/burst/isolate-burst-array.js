'use strict';

var arrayAdapter = require('../array-adapter');
var isolateBurst = require('./isolate-burst');

module.exports = function(collection, model) {
  return isolateBurst(arrayAdapter, collection, model);
};
