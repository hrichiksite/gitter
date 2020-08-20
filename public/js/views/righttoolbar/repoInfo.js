'use strict';

var repoInfoTemplate = require('./tmpl/repoInfo.hbs');
var Marionette = require('backbone.marionette');
const { getBackendForRoom } = require('gitter-web-shared/backend-utils');

module.exports = Marionette.ItemView.extend({
  template: repoInfoTemplate,

  modelEvents: {
    change: 'render'
  },

  initialize: function(options) {
    this.roomModel = options.roomModel;
    this.onRoomChange();

    this.listenTo(this.roomModel, 'change:backend', this.onRoomChange, this);
  },

  onRoomChange: function() {
    const backend = getBackendForRoom(this.roomModel);

    const shouldShowRepoInfo = backend && backend.type === 'GH_REPO';
    this.triggerMethod('repoInfo:changeVisible', shouldShowRepoInfo);
    if (!shouldShowRepoInfo) {
      this.model.clear();
      return;
    }

    this.model.fetch({
      data: {
        type: backend.type,
        linkPath: backend.linkPath
      }
    });
  }
});
