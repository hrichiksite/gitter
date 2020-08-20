'use strict';
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var NeverEndingStory = require('../../utils/never-ending-story');

module.exports = (function() {
  var Behavior = Marionette.Behavior.extend({
    defaults: {
      reverseScrolling: false,
      scrollElementSelector: null,
      contentWrapperSelector: null
    },
    initialize: function() {
      var scrollElement =
        this.options.scrollElement ||
        document.querySelector(this.options.scrollElementSelector) ||
        this.view.el;

      var contentWrapper =
        this.options.contentWrapper || document.querySelector(this.options.contentWrapperSelector);

      var reverseScrolling = this.options.reverseScrolling;

      var scroll = new NeverEndingStory(scrollElement, {
        reverse: reverseScrolling,
        contentWrapper: contentWrapper
      });

      this.listenTo(scroll, 'approaching.top', function() {
        this.view.collection.fetchMoreBefore({});
      });

      this.listenTo(scroll, 'approaching.bottom', function() {
        this.view.collection.fetchMoreAfter({});
      });

      this.scroll = scroll;
      this.view.scroll = scroll;
    },

    onDestroy: function() {
      this.scroll.disable();
    }
  });

  behaviourLookup.register('InfiniteScroll', Behavior);
  return Behavior;
})();
