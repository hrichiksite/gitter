'use strict';

module.exports = function(options, callback, request) {
  options.forever = true;
  request(options, callback);
};
