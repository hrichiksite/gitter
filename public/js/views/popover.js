/* eslint complexity: ["error", 13] */
'use strict';
var $ = require('jquery');
var _ = require('lodash');
var Marionette = require('backbone.marionette');
let Mutant;
if (typeof window !== 'undefined') {
  Mutant = require('mutantjs');
}
var popoverTemplate = require('./tmpl/popover.hbs');

var ARROW_WIDTH_PX = 10;

var HOVER_DELAY = 750;

var DEFAULTS = {
  animation: true,
  selector: false,
  title: '',
  footerView: null,
  delay: 300,
  container: false,
  placement: 'right',
  scroller: null,
  width: '',
  minHeight: ''
};

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

function generatePopoverPosition(placement, targetPos, actualWidth, actualHeight) {
  var tp;
  switch (placement) {
    case 'bottom':
      tp = {
        top: targetPos.top + targetPos.height,
        left: targetPos.left + targetPos.width / 2 - actualWidth / 2
      };
      break;
    case 'top':
      tp = {
        top: targetPos.top - actualHeight,
        left: targetPos.left + targetPos.width / 2 - actualWidth / 2 - 2
      };
      break;
    case 'left':
      tp = {
        top: targetPos.top + targetPos.height / 2 - actualHeight / 2,
        right: document.body.clientWidth - targetPos.left + ARROW_WIDTH_PX
      };
      break;
    case 'right':
      tp = {
        top: targetPos.top + targetPos.height / 2 - actualHeight / 2,
        left: targetPos.left + targetPos.width
      };
      break;
  }

  return tp;
}

var Popover = Marionette.ItemView.extend({
  template: popoverTemplate,
  className: 'popover',
  initialize: function(options) {
    _.bindAll(this, 'leave', 'enter');
    this.options = _.extend({}, DEFAULTS, options);
    //this.init('popover', element, options);
    this.view = this.options.view;
    this.titleView = this.options.titleView;
    this.title = this.options.title;
    this.footerView = this.options.footerView;

    if (this.options.scroller) {
      this.$scroller = $(this.options.scroller);
      this.scroller = this.$scroller[0];
    }

    this.targetElement = this.options.targetElement;
    this.$targetElement = $(this.targetElement);

    this.zIndex = findMaxZIndex(this.targetElement);

    this.$targetElement.on('mouseenter', this.enter);
    this.$targetElement.on('mouseleave', this.leave);
    this.once('destroy', function() {
      if (this.mutant) this.mutant.disconnect();
    });
  },

  serializeData: function() {
    return this.options;
  },

  onRender: function() {
    var $e = this.$el;

    this.view.parentPopover = this;

    if (this.zIndex) {
      this.el.style.zIndex = this.zIndex + 1;
    }

    if (this.titleView) {
      $e.find('.popover-title').append(this.titleView.render().el);
    } else if (this.title) {
      $e.find('.popover-title').text(this.title);
    } else {
      $e.find('.popover-title').hide();
    }

    $e.find('.popover-content').append(this.view.render().el);
    $e.find('.popover-inner')
      .css('width', this.options.width)
      .css('min-height', this.options.minHeight);

    var fv = this.footerView;

    if (fv) {
      fv.parentPopover = this;
      $e.find('.popover-footer-content').append(fv.render().el);
    }

    $e.on('mouseenter', this.enter);
    $e.on('mouseleave', this.leave);

    $e.addClass('popover-hidden');
    $e.removeClass('fade top bottom left right in');
  },

  enter: function() {
    if (this.timeout) clearTimeout(this.timeout);
  },

  leave: function() {
    if (!this.options.delay) {
      return self.hide();
    }

    var self = this;
    this.timeout = setTimeout(function() {
      self.hide();
    }, self.options.delay);
  },

  onDestroy: function() {
    this.$el.off('mouseenter', this.enter);
    this.$el.off('mouseleave', this.leave);

    this.$targetElement.off('mouseenter', this.enter);
    this.$targetElement.off('mouseleave', this.leave);

    if (this.titleView) {
      this.titleView.destroy();
    }
    this.view.destroy();
    if (this.footerView) {
      this.footerView.destroy();
    }
  },

  show: function() {
    var $e = this.render().$el;
    var e = this.el;

    $e.detach().css({ left: 'auto', display: 'block' });
    $e.appendTo($('body'));
    this.reposition();

    $e.removeClass('popover-hidden');

    if (Mutant && Mutant.prototype && Mutant.prototype.constructor) {
      this.mutant = new Mutant(e, this.reposition, {
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

  reposition: function() {
    try {
      var $e = this.$el;
      var e = this.el;
      var pos = this.getTargetPosition();
      if (pos.top === 0 && pos.left === 0 && pos.height === 0 && pos.width === 0) {
        /* Do not reposition */
        return;
      }

      var actualWidth = e.offsetWidth;
      var actualHeight = e.offsetHeight;

      var placement = this.options.placement;
      switch (placement) {
        case 'vertical':
          placement = this.selectBestVerticalPlacement($e, this.targetElement);
          break;
        case 'horizontal':
          placement = this.selectBestHorizontalPlacement($e, this.targetElement);
          break;
      }

      var tp = generatePopoverPosition(placement, pos, actualWidth, actualHeight);

      this.applyPlacement(tp, placement);
    } finally {
      // This is very important. If you leave it out, Chrome will likely crash.
      if (this.mutant) this.mutant.takeRecords();
    }
  },

  selectBestVerticalPlacement: function(div, target) {
    var $target = $(target);

    if (this.scroller) {
      var scrollTop = this.scroller.scrollTop;
      var scrollBottom = this.scroller.scrollTop + this.scroller.clientHeight;
      var middle = (scrollTop + scrollBottom) / 2;
      if (target.offsetTop > middle) {
        return 'top';
      } else {
        return 'bottom';
      }
    }

    var panel = $target.offsetParent();
    if (!panel) return 'bottom';
    if ($target.offset().top + div.height() + 20 >= panel[0].clientHeight) {
      return 'top';
    }

    return 'bottom';
  },

  selectBestHorizontalPlacement: function(div, target) {
    // jshint unused:true
    // var $target = $(target);

    var bounds = target.getBoundingClientRect();
    if (bounds.left < document.body.clientWidth / 2) {
      return 'right';
    } else {
      return 'left';
    }
  },

  // eslint-disable-next-line complexity, max-statements
  applyPlacement: function(offset, placement) {
    var $e = this.$el;
    var e = $e[0];

    var width = e.offsetWidth;
    var height = e.offsetHeight;
    var actualWidth = e.offsetWidth;
    var actualHeight = e.offsetHeight;
    var arrowDelta = 0;
    var replace;

    /* Adjust */
    if (placement == 'bottom' || placement == 'top') {
      if (offset.left < 0) {
        arrowDelta = -2 * offset.left;
        offset.left = 0;
      } else if (offset.left + actualWidth > window.innerWidth) {
        var overflow = window.innerWidth - (offset.left + actualWidth);
        arrowDelta = 2 * overflow;
        offset.left += overflow;
      }
    } else {
      if (offset.top < 0) {
        arrowDelta = -2 * offset.top;
        offset.top = 0;
      } else {
        var clientHeight = this.scroller ? this.scroller.clientHeight : window.innerHeight;
        if (offset.top + height > clientHeight) {
          arrowDelta = 2 * (clientHeight - offset.top - height - 10);
          offset.top = clientHeight - height - 10;
        }
      }
    }

    var newPosition = {
      top: offset.top
    };

    if (offset.right) {
      newPosition.left = 'initial';
      newPosition.right = offset.right;
    } else {
      newPosition.left = offset.left;
      newPosition.right = 'initial';
    }

    $e.css(newPosition)
      .addClass(placement)
      .addClass('in');

    if (placement == 'top' && actualHeight != height) {
      offset.top = offset.top + height - actualHeight;
      replace = true;
    }

    if (placement == 'bottom' || placement == 'top') {
      this.replaceArrow(arrowDelta - width + actualWidth, actualWidth, 'left');
    } else {
      this.replaceArrow(arrowDelta - height + actualHeight, actualHeight, 'top');
    }
    if (replace) $e.offset(offset);
  },

  replaceArrow: function(delta, dimension, position) {
    this.arrow().css(position, delta ? 50 * (1 - delta / dimension) + '%' : '');
  },

  hide: function() {
    if (this.timeout) clearTimeout(this.timeout);

    var $e = this.$el;

    $e.removeClass('in');

    $e.addClass('popover-hidden');
    setTimeout(function() {
      $e.detach();
    }, 350);

    $e.trigger('hidden');
    this.trigger('hide');
    this.destroy();

    return this;
  },

  getTargetPosition: function() {
    var el = this.targetElement;

    const pos = {};
    _.forIn(el.getBoundingClientRect(), (v, k) => (pos[k] = v));
    _.forIn(this.$targetElement.offset(), (v, k) => (pos[k] = v));

    return pos;
  },

  getTitle: function() {
    return this.options.title;
  },

  arrow: function() {
    if (!this.$arrow) {
      this.$arrow = this.$el.find('.arrow');
    }

    return this.$arrow;
  }
});

Popover.hoverTimeout = function(e, callback, scope) {
  var timeout = setTimeout(function() {
    if (!timeout) return;
    callback.call(scope, e);
  }, HOVER_DELAY);

  $(e.target).one('mouseout click', function() {
    clearTimeout(timeout);
    timeout = null;
  });
};

Popover.singleton = function(view, popover) {
  view.popover = popover;
  view.listenToOnce(popover, 'hide', function() {
    view.popover = null;
  });
};

module.exports = Popover;
