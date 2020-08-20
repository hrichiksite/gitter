'use strict';

var User = require('gitter-web-persistence').User;
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');

function findUsersById(ids) {
  return mongooseUtils.findByIds(User, ids);
}

module.exports = findUsersById;
