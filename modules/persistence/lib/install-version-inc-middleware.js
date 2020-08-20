'use strict';

module.exports = function installVersionIncMiddleware(schema) {
  schema.pre('save', function(next) {
    this.get('_tv').increment();
    next();
  });
};
