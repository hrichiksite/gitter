'use strict';

/**
 * Tests for passive scroll support
 * Copied from https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
 */
var supportsPassiveOption = false;
try {
  var opts = Object.defineProperty({}, 'passive', {
    // eslint-disable-next-line getter-return
    get: function() {
      supportsPassiveOption = true;
    }
  });
  window.addEventListener('test', null, opts);
} catch (e) {
  /* */
}

/**
 * Attempts to add a passive scroll listener if possible,
 * otherwise adds a non-capture listeners
 */
function addEventListener(target, type, handler) {
  var optionsOrCapture;
  if (supportsPassiveOption) {
    optionsOrCapture = { passive: true };
  } else {
    optionsOrCapture = false;
  }

  target.addEventListener(type, handler, optionsOrCapture);
}

function removeEventListener(target, type, handler) {
  var optionsOrCapture;
  if (supportsPassiveOption) {
    optionsOrCapture = { passive: true };
  } else {
    optionsOrCapture = false;
  }

  target.removeEventListener(type, handler, optionsOrCapture);
}

module.exports = {
  addEventListener: addEventListener,
  removeEventListener: removeEventListener
};
