'use strict';

const debug = require('debug-proxy')('app:unread-banner-view');
var Marionette = require('backbone.marionette');
var template = require('./tmpl/unreadBannerTemplate.hbs');
var appEvents = require('../../utils/appevents');
var unreadItemsClient = require('../../components/unread-items-client');
require('../behaviors/tooltip');

var TopBannerView = Marionette.ItemView.extend({
  octicon: 'octicon-chevron-up',
  position: 'Above',
  template: template,
  hidden: true,
  className: 'banner-wrapper',
  actAsScrollHelper: false,

  ui: {
    bannerMessage: '#banner-message',
    buttons: 'button'
  },

  behaviors: {
    Tooltip: {
      'button.side': { title: 'Mark as read', placement: 'top' }
    }
  },

  events: {
    'click button.main': 'onMainButtonClick',
    'click button.side': 'onSideButtonClick'
  },

  modelEvents: function() {
    var events = {};
    events['change:unread' + this.position] = 'updateVisibility';
    events['change:hasUnread' + this.position] = 'updateVisibility';
    events['change:hasMentions' + this.position] = 'updateVisibility';

    return events;
  },

  applyStyles: function() {
    if (this.getMentionsCount()) {
      this.ui.buttons.removeClass('unread');
      this.ui.buttons.addClass('mention');
      return;
    }
    if (this.getUnreadCount()) {
      this.ui.buttons.addClass('unread');
      return;
    }
    this.ui.buttons.removeClass('unread');
    this.ui.buttons.removeClass('mention');
  },

  getUnreadCount: function() {
    return this.model.get('unread' + this.position);
  },

  getMentionsCount: function() {
    return this.model.get('mentions' + this.position);
  },

  serializeData: function() {
    return { message: this.getMessage(), octicon: this.octicon };
  },

  getMessage: function() {
    var unreadCount = this.getUnreadCount();
    var mentionsCount = this.getMentionsCount();

    if (!unreadCount && !mentionsCount) return 'Go to bottom';
    if (mentionsCount === 1) return '1 mention';
    if (mentionsCount > 1) return mentionsCount + '  mentions';
    if (unreadCount === 1) return '1 unread';
    if (unreadCount > 99) return '99+ unread';
    return unreadCount + ' unread';
  },

  shouldBeVisible: function() {
    return !!this.getMentionsCount() || !!this.getUnreadCount() || !!this.actAsScrollHelper;
  },

  updateMessage: function() {
    this.ui.bannerMessage.text(this.getMessage());
  },

  updateVisibility: function() {
    this.applyStyles();
    this.updateMessage();

    // TODO Add some fancy transitions
    if (this.shouldBeVisible()) {
      this.$el.parent().show();
    } else {
      this.ui.buttons.blur();
      this.$el.parent().hide();
    }
  },

  onRender: function() {
    this.updateVisibility();
  },

  onMainButtonClick: function() {
    var mentionId = this.model.get('oldestMentionId');
    if (mentionId) {
      debug(`onMainButtonClick scrolling to unread mention=${mentionId}`);
      return appEvents.trigger('chatCollectionView:scrollToChatId', mentionId);
    }

    var itemId = this.model.get('oldestUnreadItemId');
    if (itemId) {
      debug(`onMainButtonClick scrolling to unread message=${itemId}`);
      appEvents.trigger('chatCollectionView:scrollToChatId', itemId);
    }
  },

  onSideButtonClick: function() {
    debug(`onSideButtonClick marking all messages as read`);
    unreadItemsClient.markAllRead();
  }
});

var BottomBannerView = TopBannerView.extend({
  octicon: 'octicon-chevron-down',
  position: 'Below',
  className: 'banner-wrapper bottom',
  actAsScrollHelper: false,

  initialize: function() {
    debug(`BottomBanner initialized`);
    this.listenTo(appEvents, 'atBottomChanged', this.toggleScrollHelper);
  },

  onAttach: function() {
    debug(`BottomBannerView.onAttach`);
  },

  toggleScrollHelper: function(atBottom) {
    this.actAsScrollHelper = !atBottom;
    this.updateVisibility();
  },

  onMainButtonClick: function() {
    this.toggleScrollHelper(true);

    var mentionId = this.model.get('firstMentionIdBelow');
    if (mentionId) {
      debug(`BottomBannerView.onMainButtonClick scrolling to unread mention=${mentionId}`);
      return appEvents.trigger('chatCollectionView:scrollToChatId', mentionId);
    }

    var itemId = this.model.get('firstUnreadItemIdBelow');
    if (itemId) {
      debug(`BottomBannerView.onMainButtonClick scrolling to unread message=${itemId}`);
      return appEvents.trigger('chatCollectionView:scrollToChatId', itemId);
    }

    debug(`BottomBannerView.onMainButtonClick scrolling to bottom of chats`);
    appEvents.trigger('chatCollectionView:scrollToBottom');
  },

  onSideButtonClick: function() {}
});

module.exports = {
  Top: TopBannerView,
  Bottom: BottomBannerView
};
