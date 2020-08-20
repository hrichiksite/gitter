'use strict';

var onHeaders = require('on-headers');
var env = require('gitter-web-env');
var logger = env.logger;
var config = env.config;

var statsd = env.createStatsClient({
  prefix: config.get('stats:statsd:prefix'),
  includeNodeVersionTags: true
});

var TIMEOUT = 60 * 1000;

function getRouteTag(req) {
  // This is put here by the identify-route middleware
  if (req.routeIdentifier) {
    return req.routeIdentifier;
  }

  // Fallback to the old method...
  var path = req.route && req.route.path;
  if (!path) {
    return;
  }

  path = path
    .replace(/(\.:format\?|\([^\)]*\))/g, '')
    .replace(/:/g, '_')
    .replace(/[^\w\-\/]/g, '');

  return path;
}

function getUserId(req) {
  var user = req.user;
  if (!user) return;

  return user.id || user._id; // Learn objects or not
}

function getClientId(req) {
  var authInfo = req.authInfo;
  if (!authInfo) return;
  var client = authInfo.client;
  if (!client) return;
  return client.id || client._id;
}

module.exports = function(req, res, next) {
  var timeout;

  function reportDroppedRequest() {
    var userId = getUserId(req);
    var clientId = getClientId(req);
    var routeTag = getRouteTag(req);
    var method = req.method;

    logger.warn('HTTP request still pending after ' + TIMEOUT + 'ms', {
      routeIdentifier: routeTag,
      userId: userId,
      clientId: clientId,
      method: method,
      path: req.originalUrl,
      body: req.body
    });

    var tags = ['method:' + method];
    if (routeTag) {
      tags.push('route:' + routeTag);
    }

    statsd.increment('http.request.pending', 1, tags);
  }

  function clearDroppedRequestTimeout() {
    clearTimeout(timeout);
  }

  timeout = setTimeout(reportDroppedRequest, TIMEOUT);

  onHeaders(res, clearDroppedRequestTimeout);
  next();
};
