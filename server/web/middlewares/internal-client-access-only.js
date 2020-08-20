'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var StatusError = require('statuserror');
var stats = env.stats;
var oauthService = require('gitter-web-oauth');

function isInternalClient(req) {
  if (!req.authInfo || !req.authInfo.client) return false;
  return oauthService.isInternalClient(req.authInfo.client);
}

function logAccessDenied(user, client, originalUrl) {
  var clientKey = client && client.clientKey;
  var clientId = client && (client.id || client._id);
  var userId = user && (userId.id || userId._id);

  logger.error('Non internal client attempted to access private API', {
    clientKey: clientKey,
    clientId: clientId,
    userId: userId,
    path: originalUrl
  });

  stats.event('internalapi.access.denied');
}

function isRequestFromInternalClient(req) {
  if (!isInternalClient(req)) {
    logAccessDenied(req.user, req.client, req.originalUrl);
    return false;
  }

  return true;
}

function middleware(req, res, next) {
  if (!isInternalClient(req)) {
    logAccessDenied(req.user, req.client, req.originalUrl);
    return next(new StatusError(404));
  }

  return next();
}

module.exports = {
  isRequestFromInternalClient: isRequestFromInternalClient,
  middleware: middleware
};
