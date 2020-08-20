'use strict';

var _ = require('lodash');
var Backbone = require('backbone');
var debug = require('debug-proxy')('app:nes');
var isMobile = require('./is-mobile');
var passiveEventListener = require('./passive-event-listener');

/* Put your scrolling panels on rollers */
function NeverEndingStory(target, options) {
  this._target = target;
  this._reverse = options && options.reverse;
  this._prevScrollTop = 0;
  this._prevScrollTime = Date.now();
  this._nearTop = false;
  this._nearBottom = false;
  this._scrollHandler = _.throttle(
    isMobile() ? this.mobileScroll.bind(this) : this.scroll.bind(this),
    100
  );
  this._contentWrapper = options && options.contentWrapper;
  this.enable();
}

_.extend(NeverEndingStory.prototype, Backbone.Events, {
  scroll: function() {
    var target = this._target;

    var scrollTop = target.scrollTop;
    var scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    var prevScrollTop = this._prevScrollTop;
    var prevScrollBottom = this._prevScrollBottom;

    this._prevScrollTop = scrollTop;
    this._prevScrollBottom = scrollBottom;

    var deltaTop = prevScrollTop - scrollTop;
    var deltaBottom = prevScrollBottom - scrollBottom;

    var halfClientHeight = target.clientHeight / 2;
    var nearTop = scrollTop < halfClientHeight;
    var nearBottom = scrollBottom < halfClientHeight;

    if (deltaTop > 0 && nearTop) {
      /* We're scrolling towards the top */
      this.trigger('approaching.top');
    } else if (deltaBottom > 0 && nearBottom) {
      /* We're scrolling towards the bottom */
      this.trigger('approaching.bottom');
    }

    this.scrollRate();
  },

  mobileScroll: function() {
    // ios and android have to stop scrolling in order to load more content above/below the fold (see rollers.js)
    // the best time to do that is at a natural stop, which happens to be at the start or end of the
    // current loaded content.

    var target = this._target;

    var scrollTop = target.scrollTop;
    var scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    var prevScrollTop = this._prevScrollTop;
    var prevScrollBottom = this._prevScrollBottom;

    this._prevScrollTop = scrollTop;
    this._prevScrollBottom = scrollBottom;

    var deltaTop = prevScrollTop - scrollTop;
    var deltaBottom = prevScrollBottom - scrollBottom;

    var isAtTop = scrollTop <= 0;
    var isAtBottom = scrollBottom <= 0;

    if (deltaTop > 0 && isAtTop) {
      /* We're scrolling towards the top */
      this.trigger('approaching.top');
    } else if (deltaBottom > 0 && isAtBottom) {
      /* We're scrolling towards the bottom */
      this.trigger('approaching.bottom');
    }
  },

  scrollRate: function() {
    var target = this._target;

    var now = Date.now();
    var scrollTop = target.scrollTop;
    var scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    var prevScrollTime = this._prevScrollTimeRate;
    var prevScrollTop = this._prevScrollTopRate;
    var prevScrollBottom = this._prevScrollBottomRate;

    this._prevScrollTopRate = scrollTop;
    this._prevScrollBottomRate = scrollBottom;
    this._prevScrollTimeRate = now;

    if (!prevScrollTime) return;

    var deltaTop = prevScrollTop - scrollTop;
    var deltaBottom = prevScrollBottom - scrollBottom;
    var timeDelta = now - prevScrollTime;
    var speed, timeToLimit;

    if (deltaTop > 0) {
      if (scrollTop > target.clientHeight) return;

      speed = deltaTop / timeDelta;
      timeToLimit = scrollTop / speed;
      if (timeToLimit < 600) {
        this.trigger('approaching.top');
      }
      return;
    }

    if (deltaBottom > 0) {
      if (scrollBottom > target.clientHeight) return;

      speed = deltaBottom / timeDelta;
      timeToLimit = scrollBottom / speed;

      if (timeToLimit < 600) {
        this.trigger('approaching.bottom');
      }
    }
  },

  scrollToOrigin: function() {
    var target = this._target;
    if (this._reverse) {
      var scrollTop = target.scrollHeight - target.clientHeight;
      target.scrollTop = scrollTop;
    } else {
      target.scrollTop = 0;
    }

    this._scrollHandler();
  },

  pageUp: function() {
    var target = this._target;
    var scrollTop = target.scrollTop;
    var pageHeight = Math.floor(target.offsetHeight * 0.8);
    target.scrollTop = scrollTop - pageHeight;
  },

  pageDown: function() {
    var target = this._target;
    var scrollTop = target.scrollTop;
    var pageHeight = Math.floor(target.offsetHeight * 0.8);
    target.scrollTop = scrollTop + pageHeight;
  },

  enable: function() {
    var self = this;

    if (!this._enabled) {
      debug('enabling scroll listener');
      passiveEventListener.addEventListener(this._target, 'scroll', this._scrollHandler);

      this._enabled = true;

      // If we have a content wrapper and it's smaller than the
      // client area, we need to load more content immediately
      if (this._contentWrapper) {
        setTimeout(function() {
          if (self._contentWrapper.offsetHeight < self._target.clientHeight) {
            self.trigger('approaching.top');
          }
        }, 10);
      }
    }
  },

  disable: function() {
    if (this._enabled) {
      debug('disabling scroll listener');
      passiveEventListener.removeEventListener(this._target, 'scroll', this._scrollHandler);
      this._enabled = false;
    }
  }
});

module.exports = NeverEndingStory;
