'use strict';

var StatusError = require('statuserror');
var restful = require('../../../services/restful');

module.exports = {
  id: 'username',

  show: function getUserProfile(req) {
    if (!req.params || !req.params.username) throw new StatusError(404);

    return restful.serializeProfileForUsername(req.params.username);
  }
};
