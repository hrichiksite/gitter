'use strict';

const $ = require('jquery');
const log = require('../../../utils/log');
const thisIsBrowser = typeof window !== 'undefined';
if (thisIsBrowser) require('../../../utils/tooltip');

class LinkDecorator {
  /**
   * Adds tooltip containing the 'href' property value
   * to all links with .link-tooltip class
   */
  decorate(chatItemView) {
    if (!thisIsBrowser) {
      log.warn('decoration only takes place on the client-side');
      return;
    }
    const tooltipLinks = $(chatItemView.$el).find('.link-tooltip');

    Object.values(tooltipLinks).forEach(link => {
      if (!link.href) return;
      $(link).tooltip({
        title: link.href,
        placement: 'top',
        container: 'body'
      });
    });
  }
}

module.exports = new LinkDecorator();
