'use strict';

var express = require('express');
var StatusError = require('statuserror');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var Promise = require('bluebird');

module.exports = function resourceRoute(routeIdentifier, resource) {
  var router = express.Router({ caseSensitive: true, mergeParams: true });
  var idParam = resource.id;

  if (resource.load) {
    var loadPromisified = Promise.method(resource.load);

    router.param(idParam, function(req, res, next, id) {
      loadPromisified(req, id)
        .then(function(value) {
          if (value === null || value === undefined) {
            throw new StatusError(404);
          }

          req[idParam] = value;
          return null;
        })
        .nodeify(next);
    });
  }

  function defaultRespond(req, res, responseBody) {
    if (responseBody === undefined) {
      res.sendStatus(200);
    } else {
      res.send(responseBody);
    }
  }

  function mount(method, url, methodName) {
    var promiseImpl = resource[methodName];
    if (!promiseImpl) return;

    promiseImpl = Promise.method(promiseImpl).bind(resource);

    var responder = resource.respond || defaultRespond;

    router[method](url, identifyRoute(routeIdentifier + '-' + methodName), function(
      req,
      res,
      next
    ) {
      return promiseImpl(req, res)
        .then(function(response) {
          responder(req, res, response);
          return null;
        })
        .catch(next);
    });
  }

  mount('get', '/', 'index');
  mount('get', '/new', 'new'); // TODO: remove this
  mount('post', '/', 'create');

  mount('put', '/', 'updateRoot');
  mount('patch', '/', 'patchRoot');
  mount('delete', '/', 'destroyRoot');

  if (resource.subresourcesRoot) {
    Object.keys(resource.subresourcesRoot).forEach(function(subresourceName) {
      var subresource = resource.subresourcesRoot[subresourceName];
      router.use(
        '/' + subresourceName,
        resourceRoute(routeIdentifier + '-' + subresourceName, subresource)
      );
    });
  }

  mount('get', '/:' + idParam, 'show');
  mount('get', '/:' + idParam + '/edit', 'edit'); // TODO: remove this
  mount('put', '/:' + idParam, 'update');
  mount('patch', '/:' + idParam, 'patch');
  mount('delete', '/:' + idParam, 'destroy');

  if (resource.subresources) {
    Object.keys(resource.subresources).forEach(function(subresourceName) {
      var subresource = resource.subresources[subresourceName];
      router.use(
        '/:' + idParam + '/' + subresourceName,
        resourceRoute(routeIdentifier + '-' + subresourceName, subresource)
      );
    });
  }

  return router;
};
