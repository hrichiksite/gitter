'use strict';

// Implements EventListener
function OnceEventListener(target, type, callback, context) {
  target.addEventListener(type, this, false);

  this.handleEvent = function(e) {
    target.removeEventListener(type, this, false);
    callback.call(context, e);
  };
}

module.exports = function onReady(callback, context) {
  new OnceEventListener(window, 'DOMContentLoaded', callback, context);
};
