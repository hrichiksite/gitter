'use strict';

var Marionette = require('backbone.marionette');
var classnames = require('classnames');
var PermissionsPeopleListItemTemplate = require('./tmpl/modal-footer-button-list-view-item.hbs');

var FooterButtonListItemView = Marionette.ItemView.extend({
  template: PermissionsPeopleListItemTemplate,
  tagName: 'button',
  attributes: function() {
    var action = this.model.get('action');

    var attributes = {
      'data-action': action,
      'data-component': 'modal-btn'
    };

    var disabled = this.model.get('disabled');
    if (disabled) {
      attributes['disabled'] = disabled;
    }

    var className = this.model.get('className');
    var pull = this.model.get('pull');

    var classMap = {};
    classMap[className] = true;
    classMap['pull-' + pull] = !!pull;

    attributes['class'] = classnames(classMap);

    return attributes;
  },

  triggers: {
    click: 'item:activate'
  }
});

var FooterButtonListView = Marionette.CollectionView.extend({
  template: '',
  childView: FooterButtonListItemView,
  className: 'modal--default__footer',

  childEvents: {
    'item:activate': 'onItemActivated'
  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;
  },

  onItemActivated: function(view) {
    this.trigger('item:activate', view.model);
  }
});

module.exports = FooterButtonListView;
