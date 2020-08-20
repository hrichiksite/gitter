'use strict';
var $ = require('jquery');
var _ = require('lodash');
var Marionette = require('backbone.marionette');
var cocktail = require('backbone.cocktail');
var Mutant = require('mutantjs');
var SelectableMixin = require('./selectable-mixin');
var itemTemplate = require('./tmpl/dropdownItem.hbs');
var dataset = require('../../utils/dataset-shim');

module.exports = (function() {
  /* Transition period on css */
  var TRANSITION = 160;

  function findMaxZIndex(element) {
    var max = 0;
    while (element && element != document) {
      var style = window.getComputedStyle(element, null);

      if (style) {
        var zIndex = style.getPropertyValue('z-index');
        if (zIndex && zIndex !== 'auto') {
          zIndex = parseInt(zIndex, 10);
          if (zIndex > max) {
            max = zIndex;
          }
        }
      }

      element = element.parentNode;
    }

    return max;
  }

  var backdropClass = 'dropdown-backdrop';
  var backdropSelector = '.' + backdropClass;

  var DropdownItemView = Marionette.ItemView.extend({
    tagName: 'li',
    template: itemTemplate,
    initialize: function(options) {
      if (options && options.template) {
        this.template = options.template;
      }
      if (options && options.serializeData) {
        this.serializeData = options.serializeData;
      }
    },
    className: function() {
      if (this.model.get('divider')) {
        return 'divider';
      }

      return '';
    },
    onRender: function() {
      /** Add anything in the dataset attribute to the Anchor tag's dataset */
      var ds = this.model.get('dataset');
      if (ds) {
        var a = this.el.querySelector('a');

        if (a) {
          Object.keys(ds).forEach(function(key) {
            dataset.set(a, key, ds[key]);
          });
        }
      }

      dataset.set(this.el, 'cid', this.model.cid);
    }
  });

  var activeDropdown = null;

  var DEFAULTS = {
    placement: 'left'
  };

  var DropdownMenuView = Marionette.CollectionView.extend({
    childView: DropdownItemView,
    tagName: 'ul',
    className: 'dropdown dropdown-hidden selectable',
    ui: {
      menu: 'ul.dropdown'
    },
    events: {
      keydown: 'keydown',
      'click li a': 'clicked'
    },

    childViewOptions: function() {
      var options = {};
      if (this.options.itemTemplate) {
        options.template = this.options.itemTemplate;
      }
      if (this.options.itemSerializeData) {
        options.serializeData = this.options.itemSerializeData;
      }
      return options;
    },

    initialize: function(options) {
      if (options.targetElement) {
        this.setTargetElement(options.targetElement);
      }

      this.options = _.extend({}, DEFAULTS, options);

      this.dropdownClass = options.dropdownClass;

      /* From the selectable-mixin */
      this.listenTo(this, 'selectClicked', function() {
        this.hide();
      });
    },

    setTargetElement: function(el) {
      this.targetElement = el;
      this.$targetElement = $(el);
    },

    active: function() {
      return !this.$el.hasClass('dropdown-hidden');
    },

    onRender: function() {
      var zIndex = findMaxZIndex(this.targetElement) + 5;
      if (zIndex < 100) {
        zIndex = 100;
      }
      this.el.style.zIndex = zIndex;
      if (this.dropdownClass) {
        this.el.classList.add(this.dropdownClass);
      }
    },

    onDestroy: function() {
      if (this.mutant) this.mutant.disconnect();
      $(backdropSelector).off(this.backdropClickedCallback);
    },

    clicked: function() {
      if (!this.collection) {
        /* Static */
        this.hide();
      }
    },
    backdropClickedCallback: function() {
      $(backdropSelector).remove();
      if (activeDropdown) {
        var t = activeDropdown;
        activeDropdown = null;
        t.hide();
      }
    },

    getPosition: function() {
      var el = this.targetElement;

      const pos = {};
      _.forIn(el.getBoundingClientRect(), (v, k) => (pos[k] = v));
      _.forIn(this.$targetElement.offset(), (v, k) => (pos[k] = v));

      return pos;
    },

    hasItems: function() {
      if (this.collection) return this.collection.length > 0;

      // Static mode
      return true;
    },

    onAddChild: function() {
      setTimeout(
        function() {
          if (!this.active() && this.showWhenItems && this.hasItems()) {
            this.show();
          }
        }.bind(this),
        10
      );
    },

    onRemoveChild: function() {
      setTimeout(
        function() {
          if (!this.hasItems()) {
            this.hide();
            this.showWhenItems = true;
          }
        }.bind(this),
        10
      );
    },

    show: function() {
      if (this.active()) return;

      if (!this.hasItems()) {
        this.showWhenItems = true;
        return;
      }

      var $e = this.render().$el;
      var e = this.el;

      // Stop any impending actions from hide
      window.clearTimeout(this.hideTimeoutId);

      $(backdropSelector).remove();
      if (activeDropdown) {
        activeDropdown.hide();
      }

      activeDropdown = this;

      var zIndex = parseInt(this.el.style.zIndex, 10);
      $('<div class="' + backdropClass + ' ' + this.options.backdropClass + '"/>')
        .css({ zIndex: zIndex - 1 })
        .insertAfter($('body'))
        .on('click', this.backdropClickedCallback);

      this.setActive(this.selectedModel);

      $e.detach().css({ top: 0, left: 0, display: 'block' });
      $e.appendTo($('body'));
      this.reposition();

      $e.removeClass('dropdown-hidden');

      if (!this.mutant) {
        this.mutant = new Mutant(e, this.mutationReposition, {
          scope: this,
          timeout: 20,
          transitions: true,
          observers: {
            attributes: true,
            characterData: true
          }
        });
      }
    },

    hide: function() {
      var $el = this.$el;
      this.showWhenItems = false;
      if (!this.active()) return;
      // $el.find('li.active:not(.divider):visible').removeClass('active');
      $el.addClass('dropdown-hidden');
      $(backdropSelector).remove();

      this.hideTimeoutId = window.setTimeout(function() {
        $el.css({ display: 'none' });
      }, TRANSITION);
      activeDropdown = null;
    },

    mutationReposition: function() {
      try {
        if (!this.active()) return;
        this.reposition();
      } finally {
        // This is very important. If you leave it out, Chrome will likely crash.
        if (this.mutant) this.mutant.takeRecords();
      }
    },

    reposition: function() {
      var e = this.el;
      var pos = this.getPosition();

      var actualWidth = e.offsetWidth;

      var left;
      if (this.options.placement === 'left') {
        left = pos.left;
      } else {
        left = pos.left - actualWidth + pos.width;
      }

      var tp = { top: pos.top + pos.height, left: left };
      this.applyPlacement(tp);
    },

    applyPlacement: function(offset) {
      var $e = this.$el;

      var replace;

      /* Adjust */
      if ('left' in offset && offset.left < 0) {
        offset.left = 0;
      }

      $e.css(offset);

      if (replace) $e.offset(offset);
    },

    toggle: function() {
      var isActive = this.active();
      if (isActive) {
        this.hide();
      } else {
        this.show();
      }
    },

    keydown: function(e) {
      switch (e.keyCode) {
        case 13:
          this.selected();
          return;
        case 27:
          this.hide();
          break;
        default:
          return;
      }

      e.preventDefault();
      e.stopPropagation();
    }
  });
  cocktail.mixin(DropdownMenuView, SelectableMixin);
  return DropdownMenuView;
})();
