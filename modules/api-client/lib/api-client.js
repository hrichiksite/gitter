'use strict';
/**
 * API Client
 *
 * This is a basic API client for communicating with the Gitter server.
 *
 * Basic Use
 * ------------
 *
 * The basic form of requests is:
 * apiClient.operation(url, data, options) -> $.Deferrer
 *
 * apiClient.get('/v1/eyeballs', data, options)
 * apiClient.post('/v1/eyeballs', data, options)
 * apiClient.put('/v1/eyeballs', data, options)
 * apiClient.patch('/v1/eyeballs', data, options)
 * apiClient.delete('/v1/eyeballs', data, options)
 *
 * Note that you should not include /api/ in your URL.
 *
 * Advanced usage
 * ---------------
 * These operations will use the current user resource as their root,
 *
 * The sub-resources available are:
 *
 * Sub Resource       | Root Resource
 * apiClient.user     | /v1/user/:userId
 * apiClient.userRoom | /v1/rooms/:roomId/user/:userId
 * apiClient.room     | /v1/rooms/:roomId
 *
 * Example
 * -------
 * Send a message to the current room:
 *
 * apiClient.room.post('/chatMessages', { text: 'hello from api client' })
 *   .then(function(response) {
 *     window.alert('I did a post.');
 *   })
 *   .catch(function(err) {
 *     window.alert('I am a failure: ' + err.status);
 *   })
 */

var Promise = require('bluebird');
var _ = require('lodash');
var Backbone = require('backbone');
var Resource = require('./resource');

var CONFIG_DEFAULTS = {
  baseUrl: 'https://api.gitter.im/',
  accessToken: '',
  getUserId: function() {
    return '';
  },
  getTroupeId: function() {
    return '';
  }
};

function ApiClient(config) {
  this._config = config = _.extend({}, CONFIG_DEFAULTS, config);

  var apiBasePath = config.baseUrl;

  var base = (this.base = new Resource(this, config, apiBasePath, ''));

  // Splice public methods from base onto the client
  // to maintain backwards compatibility
  Object.keys(Resource.prototype).forEach(function(key) {
    if (key.indexOf('_') === 0) return;
    var v = base[key];
    if (typeof v !== 'function') return;
    this[key] = v.bind(base);
  }, this);

  /* /v1/user/:currentUserId/ */
  this.user = new Resource(this, config, apiBasePath, this._getUserUrl);

  /* /v1/rooms/:currentRoomId/ */
  this.room = new Resource(this, config, apiBasePath, this._getRoomUrl);

  /* /v1/user/:currentUserId/rooms/:currentRoomId/ */
  this.userRoom = new Resource(this, config, apiBasePath, this._getUserRoomUrl);

  /* /private */
  this.priv = new Resource(this, config, apiBasePath, '/private');

  // The Web resource doesn't use the basepath
  this.web = new Resource(this, config, '', '');
}

_.extend(ApiClient.prototype, Backbone.Events, {
  _getUserUrl: function() {
    return '/v1/user/' + this._config.getUserId();
  },

  _getRoomUrl: function() {
    return '/v1/rooms/' + this._config.getTroupeId();
  },

  _getUserRoomUrl: function() {
    return '/v1/user/' + this._config.getUserId() + '/rooms/' + this._config.getTroupeId();
  },

  _getAccessToken: Promise.method(function() {
    var accessToken = this._config.accessToken;

    if (typeof accessToken === 'function') {
      return accessToken();
    }

    return accessToken;
  })
});

module.exports = ApiClient;
