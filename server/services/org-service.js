'use strict';

var BackendMuxer = require('gitter-web-backend-muxer');

function getOrgsForUser(user) {
  var backendMuxer = new BackendMuxer(user);
  return backendMuxer.findOrgs();
}

module.exports = {
  getOrgsForUser: getOrgsForUser
};
