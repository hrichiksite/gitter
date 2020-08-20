'use strict';

var env = require('gitter-web-env');
var config = env.config;

var webPathBase = config.get('web:oauthBasePath') || config.get('web:basepath');

function standardCallbackUrlBuilder(service) {
  if (service) {
    return webPathBase + '/login/' + service + '/callback';
  } else {
    return webPathBase + '/login/callback';
  }
}

module.exports = standardCallbackUrlBuilder;
