'use strict';

// fastclick doesnt increment event.detail for double, triple clicks
// as its a read only value, so this class works around that.

// should be 300ms, but the touch delays seem to mess up
var DOUBLE_TAP_TIME = 350;

var DoubleTapper = function() {
  this._tapCount = 0;
  this._timeout = null;
};

DoubleTapper.prototype.registerTap = function() {
  var self = this;
  this._tapCount++;

  clearTimeout(this._timeout);
  this._timeout = setTimeout(function() {
    self._tapCount = 0;
  }, DOUBLE_TAP_TIME);

  return this._tapCount;
};

module.exports = DoubleTapper;
