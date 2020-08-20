'use strict';

var Backbone = require('backbone');
var apiClient = require('../components/api-client');
var autoModelSave = require('../utils/auto-model-save');
var context = require('gitter-web-client-context');

var RightToolbarModel = Backbone.Model.extend({
  defaults: {
    isPinned: true
  },

  initialize: function() {
    autoModelSave(this, ['isPinned'], this.autoPersist);
  },

  toJSON: function() {
    // Get around circular structure
    //eslint-disable-next-line
    var attrs = this.attributes;
    return Object.keys(this.defaults).reduce(function(memo, key) {
      memo[key] = attrs[key];
      return memo;
    }, {});
  },

  /**
   * Used by autoModelSave
   */
  autoPersist: function() {
    return apiClient.user.put('/settings/rightToolbar', this.toJSON(), {
      // No need to get the JSON back from the server...
      dataType: 'text'
    });
  }
});

var rightToolbarSnapshot = context.getSnapshot('rightToolbar');
module.exports = new RightToolbarModel(rightToolbarSnapshot);
