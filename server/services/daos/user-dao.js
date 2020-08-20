'use strict';

var persistence = require('gitter-web-persistence');
var promiseUtils = require('../../utils/promise-utils');

function create(lean) {
  var module = {};

  module.findByIdRequired = function(id, fields) {
    return persistence.User.findById(id, fields, { lean: lean })
      .exec()
      .then(promiseUtils.required);
  };

  module.findById = function(id, fields) {
    return persistence.User.findById(id, fields, { lean: lean }).exec();
  };

  return module;
}

module.exports = {
  lean: create(true), // -> lean: true
  full: create(false) // -> lean: false
};
