'use strict';
// var $ = require('jquery');
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var matchesSelector = require('../../utils/matches-selector');
var RAF = require('../../utils/raf');
var isCompact = require('../../utils/detect-compact');

require('../../utils/tooltip');

// if a an element was created in this event loop under
// the user's pointer, this function will trigger a mouseover.
function triggerMouseoverForHover(el) {
  // browser doent know that something is hovered or not until
  // the next animation frame
  RAF(function() {
    if (!matchesSelector(el, ':hover')) return;

    // Force a mouseover event to wake up the tooltip
    var evt;
    try {
      evt = new MouseEvent('mouseover');
    } catch (e) {
      /* Internet Explorer, good times */
      evt = document.createEvent('MouseEvents');
      evt.initMouseEvent(
        'mouseover',
        true,
        true,
        window,
        0,
        0,
        0,
        80,
        20,
        false,
        false,
        false,
        false,
        0,
        null
      );
    }
    el.dispatchEvent(evt);
  });
}

var Behavior = Marionette.Behavior.extend({
  onRender: function() {
    if (isCompact()) return;

    // existing tooltips are no longer on the dom due to render.
    // so we clean up the listeners etc.
    this.destroyTooltips();

    if (!this.tooltips) this.tooltips = {};
    if (!this.handlers) this.handlers = {};

    var self = this;

    Object.keys(this.options).forEach(function(selector) {
      var $el = selector === '' ? self.$el : self.$el.find(selector);
      var el = $el[0];
      if (!el) {
        // Cannot find element? Don't continue
        return;
      }

      var handler = self.createHandler($el, el, selector);
      el.addEventListener('mouseover', handler, false);
      self.handlers[selector] = handler;

      triggerMouseoverForHover(el);
    });
  },

  createHandler: function($el, el, selector) {
    var self = this;

    return {
      el: el,
      handleEvent: function() {
        el.removeEventListener('mouseover', this, false);
        delete self.handlers[selector];

        self.initTooltip(selector, $el, el);
      }
    };
  },

  initTooltip: function(selector, $el, el) {
    var tooltipOptions = this.options[selector];

    var title = tooltipOptions.title || el.getAttribute('title');
    if (typeof tooltipOptions.titleFn === 'function') {
      title = tooltipOptions.titleFn.bind(this.view)();
    } else if (tooltipOptions.titleFn) {
      title = this.view[tooltipOptions.titleFn].bind(this.view);
    }

    this.tooltips[selector] = $el;
    $el.tooltip({
      html: tooltipOptions.html,
      title: title,
      placement: tooltipOptions.placement,
      container: tooltipOptions.container || 'body'
    });

    var customUpdateEventName = tooltipOptions.customUpdateEvent;
    if (customUpdateEventName) {
      this.view.on(customUpdateEventName, this.updateTooltip.bind(this, $el));
    }

    triggerMouseoverForHover(el);
  },

  onDestroy: function() {
    this.destroyHandlers();
    this.destroyTooltips();
  },

  destroyHandlers: function() {
    var handlers = this.handlers;
    delete this.handlers;

    if (!handlers) return;

    Object.keys(handlers).forEach(function(selector) {
      var handler = handlers[selector];
      var el = handler.el;
      el.removeEventListener('mouseover', handler, false);
    });
  },

  destroyTooltips: function() {
    var tooltips = this.tooltips;
    delete this.tooltips;

    if (!tooltips) return;

    Object.keys(tooltips).forEach(function(selector) {
      var $el = tooltips[selector];
      $el.tooltip('destroy');
    });
  },

  // Limitation of bootstrap tooltip library
  // We do this so that when you click a toggle for example,
  // the tooltip text is properly updated to show the inverse hint
  updateTooltip: function($el) {
    $el.tooltip('hide');
    $el.tooltip('show');
  }
});

behaviourLookup.register('Tooltip', Behavior);

module.exports = Behavior;
