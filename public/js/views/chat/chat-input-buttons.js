'use strict';

var Marionette = require('backbone.marionette');
var template = require('./tmpl/chat-input-buttons.hbs');
var platformKeys = require('../../utils/platform-keys');
var cocktail = require('backbone.cocktail');
var KeyboardEventsMixin = require('../keyboard-events-mixin');
var isMobile = require('../../utils/is-mobile');
require('../behaviors/tooltip');

var ChatInputButtons = Marionette.ItemView.extend({
  template: template,

  behaviors: {
    Tooltip: {
      '.js-toggle-compose-mode': {
        titleFn: 'getComposeModeTitle',
        placement: 'left',
        customUpdateEvent: 'updateComposeTooltipText'
      },
      '.js-markdown-help': { titleFn: 'getShowMarkdownTitle', placement: 'left' }
    }
  },

  ui: {
    composeToggle: '.js-toggle-compose-mode'
  },

  events: {
    'click .js-toggle-compose-mode': 'toggleComposeMode'
  },

  modelEvents: {
    'change:isComposeModeEnabled': 'composeModeChanged'
  },

  keyboardEvents: {
    'chat.toggle': 'toggleComposeMode'
  },

  getComposeModeTitle: function() {
    var mode = this.model.get('isComposeModeEnabled') ? 'chat' : 'compose';
    return 'Switch to ' + mode + ' mode (' + platformKeys.cmd + ' + /)';
  },

  getShowMarkdownTitle: function() {
    return 'Markdown help (' + platformKeys.cmd + ' + ' + platformKeys.gitter + ' + m)';
  },

  toggleComposeMode: function() {
    // compose mode is always off for mobile
    if (isMobile()) return;

    this.model.set('isComposeModeEnabled', !this.model.get('isComposeModeEnabled'));
  },

  composeModeChanged: function() {
    this.ui.composeToggle[0].setAttribute(
      'data-compose-mode',
      this.model.get('isComposeModeEnabled')
    );
    this.ui.composeToggle[0].setAttribute('aria-label', this.getComposeModeTitle());
    this.trigger('updateComposeTooltipText');
  },

  serializeData: function() {
    var data = this.model.toJSON();

    data.composeModeMessage = this.getComposeModeTitle();
    data.markdownHelpMessage = this.getShowMarkdownTitle();

    return data;
  }
});

cocktail.mixin(ChatInputButtons, KeyboardEventsMixin);

module.exports = ChatInputButtons;
