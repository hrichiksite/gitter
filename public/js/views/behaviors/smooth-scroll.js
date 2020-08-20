'use strict';
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var _ = require('lodash');
var rafUtils = require('../../utils/raf-utils');
var passiveEventListener = require('../../utils/passive-event-listener');

var Behavior = Marionette.Behavior.extend({
  defaults: {
    scrollElementSelector: null,
    contentWrapper: null
  },

  initialize: function() {
    var selector = this.options.scrollElementSelector;
    var wrapperSelector = this.options.contentWrapper;
    this.queue = [];

    this.scrollElement = selector ? document.querySelector(selector) : this.view.el;
    this.wrapper = wrapperSelector ? this.scrollElement.querySelector(wrapperSelector) : null;

    // Make sure every time the collectionView renders it decorates its childs and updates the banners
    this.listenTo(this.view, 'render', this.decorateIfVisible);

    // Debounced actions for improved performance
    this.lazyDecorator = _.debounce(this.decorateIfVisible.bind(this), 500);
    this.lazyDecoratorQueue = rafUtils.debounce(this.decorateQueue, this);

    this.lazyTracker = _.debounce(this.trackViewport.bind(this), 500);
    this.lazyPointerEvents = _.debounce(this.enablePointerEvents.bind(this), 250);

    this.scrollHandler = this.smoothScroll.bind(this);
    passiveEventListener.addEventListener(this.scrollElement, 'scroll', this.scrollHandler);
  },

  // Trigger an event on the child of it's currently on screen
  decorateIfVisible: function() {
    this.view.children.each(
      function(child) {
        if (this.isElementVisible(child.el)) child.trigger('messageInViewport');
      }.bind(this)
    );
  },

  onAddChild: function(child) {
    this.queue.push(child);
    this.lazyDecoratorQueue();
  },

  decorateQueue: function() {
    var queue = this.queue;
    this.queue = [];

    queue.forEach(function(child) {
      if (this.isElementVisible(child.el)) child.trigger('messageInViewport');
    }, this);
  },

  // Give an element tells you if it's on screen or above/below the fold
  isElementVisible: function(el) {
    var rect = el.getBoundingClientRect();
    return (
      rect.bottom >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight)
    );
  },

  // Trigger an event on the view after scrolling to keep track of the most centered element on screen
  trackViewport: function() {
    this.view.triggerMethod('trackViewportCenter');
  },

  // Disable hover and other pointer events while scrolling
  disablePointerEvents: function() {
    if (this.wrapper && !this.wrapper.classList.contains('disable-hover'))
      this.wrapper.classList.add('disable-hover');
  },

  enablePointerEvents: function() {
    if (this.wrapper) this.wrapper.classList.remove('disable-hover');
  },

  smoothScroll: function() {
    this.disablePointerEvents();
    this.lazyDecorator();
    this.lazyTracker();
    this.lazyPointerEvents();
  },

  onDestroy: function() {
    passiveEventListener.removeEventListener(this.scrollElement, 'scroll', this.scrollHandler);
  }
});

behaviourLookup.register('SmoothScroll', Behavior);
module.exports = Behavior;
