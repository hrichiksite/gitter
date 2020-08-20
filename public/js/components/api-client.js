'use strict';

var clientEnv = require('gitter-client-env');
var context = require('gitter-web-client-context');
var appEvents = require('../utils/appevents');
var ApiClient = require('gitter-web-api-client');

// Minimize the number of different errors which are actually the same
// This is useful for Sentry http://app.getsentry.com
var routes = {
  githubIssues: /^\/api\/private\/gh\/[^/]+\/[^/]+\/issues/,
  githubUsers: /^\/api\/private\/gh\/users\//
};

function findRouteForUrl(url) {
  var r = Object.keys(routes);
  for (var i = 0; i < r.length; i++) {
    var routeName = r[i];
    var re = routes[routeName];

    if (re.test(url)) return routeName;
  }
}

function handleApiError(status, statusText, method, url) {
  var route = findRouteForUrl(url);

  if (statusText === 'error' && status === 404) {
    /* Unreachable server */
    appEvents.trigger('bugreport', 'ajaxError: unreachable: ' + method + ' ' + (route || url), {
      tags: {
        type: 'ajax',
        subtype: 'unreachable',
        url: url
      }
    });
  } else if (status < 500) {
    // 400 errors are the problem of the ajax caller, not the global handler
    return;
  } else {
    appEvents.trigger(
      'bugreport',
      'ajaxError: HTTP ' + status + ' on ' + method + ' ' + (route || url),
      {
        tags: {
          type: 'ajax',
          subtype: 'HTTP' + status,
          url: url
        }
      }
    );
  }

  appEvents.trigger('ajaxError');
}

var apiClient = new ApiClient({
  baseUrl: clientEnv['apiBasePath'],
  accessToken: context.getAccessToken,
  getUserId: context.getUserId,
  getTroupeId: context.getTroupeId
});

apiClient.on('error', function(err) {
  handleApiError(err.status, err.statusText, err.method, err.url);
});

module.exports = apiClient;
