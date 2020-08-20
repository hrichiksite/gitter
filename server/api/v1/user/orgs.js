'use strict';

var restful = require('../../../services/restful');
var StatusError = require('statuserror');

module.exports = {
  id: 'org',
  index: function(req) {
    if (!req.user) throw new StatusError(403);

    return restful.serializeOrgsForUser(req.user);
  }
};
