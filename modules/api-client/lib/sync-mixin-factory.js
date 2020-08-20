'use strict';

var _ = require('lodash');

var methodMap = {
  create: 'post',
  update: 'put',
  patch: 'patch',
  delete: 'delete',
  read: 'get'
};

/**
 * Creates a sync-mixin using an api-client instance singleton
 */
function syncMixinFactory(apiClient) {
  function performAction(m, url, model, options) {
    switch (m) {
      case 'get':
        return apiClient.get(url, options.data);

      case 'patch':
        if (options.attrs) {
          return apiClient.patch(url, options.attrs);
        } else {
          return apiClient.patch(url, model);
        }
      /* break; */

      default:
        return apiClient[m](url, model);
    }
  }

  return {
    sync: function(method, model, options) {
      var url = options.url || _.result(model, 'url');
      if (!url) throw new Error('URL required');

      var m = methodMap[method];

      var promise = performAction(m, url, model, options);

      if (options.success) {
        promise = promise.tap(options.success);
      }

      if (options.error) {
        // Backbone will trigger the 'error' event
        promise = promise.catch(options.error);
      }

      model.trigger(
        'request',
        model,
        null,
        _.extend({}, options, {
          method: method
        })
      );

      return promise;
    }
  };
}

module.exports = syncMixinFactory;
