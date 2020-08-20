'use strict';

var Marionette = require('backbone.marionette');
var PermissionsPeopleListTemplate = require('./permissions-people-list-view.hbs');
var PermissionsPeopleListItemTemplate = require('./permissions-people-list-item-view.hbs');

var PermissionsPeopleListItemView = Marionette.ItemView.extend({
  template: PermissionsPeopleListItemTemplate,
  tagName: 'li',
  className: 'permissions-people-list-item',

  ui: {
    removeButton: '.permissions-people-list-item-remove-button'
  },

  triggers: {
    'click @ui.removeButton': 'item:remove'
  }
});

var PermissionsPeopleListView = Marionette.CompositeView.extend({
  template: PermissionsPeopleListTemplate,
  childView: PermissionsPeopleListItemView,
  childViewContainer: '.permissions-people-list',

  childViewOptions: function() {
    return {
      communityCreateModel: this.communityCreateModel,
      allowRemove: this.options.allowRemove
    };
  },

  childEvents: {
    'item:remove': 'onItemRemoved'
  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;
  },

  onItemRemoved: function(view) {
    this.trigger('user:remove', view.model);
  }
});

module.exports = PermissionsPeopleListView;
