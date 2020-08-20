'use strict';

var $ = require('jquery');
var _ = require('lodash');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var modalTemplate = require('./tmpl/modal.hbs');
var ModalFooterButtonListView = require('./modal-footer-button-list-view');
var isCompact = require('../../utils/detect-compact');

require('../../template/helpers/all');
require('../behaviors/isomorphic');
require('@gitterhq/styleguide/css/components/modals.css');

var ModalView = Marionette.LayoutView.extend({
  template: modalTemplate,
  className: 'modal',

  ui: {
    title: '.js-modal-title-text'
  },

  events: {
    'click .close': 'hide',
    'click [data-action=close]': 'hide'
  },

  regions: {
    modalBody: '#modal-body-region',
    modalFooter: '#modal-footer-region'
  },

  initialize: function(options) {
    this.options = {
      // Backbone Collection or array of items
      menuItems: [],
      title: null,
      modalClassVariation: null,
      backdrop: true
    };
    _.extend(this.options, options);

    this.view = this.options.view || this.view;

    if (this.options.menuItems && this.options.menuItems.models) {
      this.menuItemCollection = this.options.menuItems;
    } else {
      var menuItems = this.menuItems || this.options.menuItems || [];
      if (typeof menuItems === 'function') {
        menuItems = menuItems.call(this);
      }

      this.menuItemCollection = new Backbone.Collection(menuItems);
    }

    this.footerView = new ModalFooterButtonListView({
      collection: this.menuItemCollection
    });
    this.listenTo(this.footerView, 'item:activate', this.onMenuItemActivated, this);
  },

  serializeData: function() {
    return {
      title: this.options.title,
      modalClassVariation: this.options.modalClassVariation
    };
  },

  onMenuItemActivated: function(itemModel) {
    var action = itemModel.get('action');
    this.view.trigger('menuItemClicked', action);
    this.trigger('menuItemClicked', action);
  },

  onRender: function() {
    var self = this;
    this.$el.hide();

    this.modalBody.show(this.view);
    this.modalFooter.show(this.footerView);

    if (!isCompact() && !this.disableAutoFocus) {
      window.setTimeout(function() {
        try {
          var v = self.$el.find(
            'input[type=text], input[type=url], input[type=tel], input[type=number], input[type=color], input[type=email]'
          )[0];
          if (v) {
            v.focus();
            v.select();
          }
        } catch (e) {
          /* */
        }
      }, 100);
    } else if (!isCompact()) {
      // Focus the modal overall so you can start navigating to the controls
      this.el.focus();
    }
  },

  setButtonState: function(name, state) {
    var $s = this.$el.find('button[data-action=' + name + ']');
    if (state) {
      $s.removeAttr('disabled');
    } else {
      $s.attr('disabled', true);
    }
  },

  toggleButtonClass: function(name, className, enabled) {
    var $s = this.$el.find('button[data-action=' + name + ']');
    $s.toggleClass(className, enabled);
  },

  hideActions: function() {
    var $s = this.$el.find('.modal-footer .action');
    $s.hide();
  },

  showActions: function() {
    var $s = this.$el.find('.modal-footer .action');
    $s.show();
  },

  showPremium: function() {
    var $s = this.$el.find('.premium');
    $s.removeClass('hidden');
    $s.show();
  },

  hidePremium: function() {
    var $s = this.$el.find('.modal-footer .premium');
    $s.addClass('hidden');
    $s.hide();
  },

  onDestroy: function() {
    this.view.destroy();
    this.view.dialog = null;
  },

  prepare: function() {
    if (!this.rendered) {
      this.render();
      this.rendered = true;
    }
  },

  show: function() {
    this.view.dialog = this;

    var that = this;
    if (this.isShown) return;

    this.prepare();

    $('body').addClass('modal-open');

    this.isShown = true;
    this.$el.trigger('show');
    this.trigger('show');

    this.escape();
    this.backdrop(function() {
      if (!that.$el.parent().length) {
        that.$el.appendTo(that.$backdrop); //don't move modals dom position
      }

      that.$el.show();
      that.$el.addClass('in');
      that.$el.trigger('shown');
      that.trigger('shown');
    });
  },

  hide: function(e) {
    if (e) e.preventDefault();
    if (this.navigable) {
      window.location = '#';
      return;
    }
    this.hideInternal();
  },

  /* Called after navigation to destroy an navigable dialog box */
  navigationalHide: function() {
    this.hideInternal();
  },

  hideInternal: function() {
    if (!this.isShown) return;

    this.isShown = false;

    $('body').removeClass('modal-open');

    this.escape();

    this.$el.trigger('hide').removeClass('in');

    this.trigger('hide');

    this.hideModal();
  },

  hideModal: function() {
    this.$el.hide().trigger('hidden');

    this.trigger('hidden');
    this.backdrop();

    this.destroy();
  },

  backdrop: function(callback) {
    if (this.isShown && this.options.backdrop !== false) {
      this.$backdrop = $('<div class="modal-backdrop" />').appendTo(document.body);

      var bd = this.$backdrop;
      this.$backdrop.click(function(e) {
        if (e.target !== this) return;
        bd.modal.hide();
      });
      this.$backdrop.modal = this;
      this.$backdrop.addClass('in');

      callback();
    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in');

      this.removeBackdrop();
    } else if (callback) {
      callback();
    }
  },

  removeBackdrop: function() {
    this.$backdrop.remove();
    this.$backdrop = null;
  },

  escape: function() {
    var that = this;
    if (this.isShown) {
      $(document).on('keydown', keydown);
    } else if (!this.isShown) {
      $(document).off('keydown', keydown);
    }

    function keydown(e) {
      if (e.which === 27) that.hide();
    }
  }
});

module.exports = ModalView;
