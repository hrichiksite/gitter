// This file bootstraps any Vue code that is on the page

const store = require('./store/store-instance');
const renderLeftMenu = require('./left-menu').default;
const renderThreadMessageFeed = require('./thread-message-feed').default;

const leftMenuRootEl = document.querySelector('.js-left-menu-root');
if (leftMenuRootEl) {
  renderLeftMenu(leftMenuRootEl, store);
}

const threadMessageFeedRootEl = document.querySelector('.js-thread-message-feed-root');
if (threadMessageFeedRootEl) {
  renderThreadMessageFeed(threadMessageFeedRootEl, store);
}
