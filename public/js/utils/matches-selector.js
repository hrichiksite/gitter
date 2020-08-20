'use strict';

var ElementPrototype = Element.prototype;
var fn =
  ElementPrototype.matches ||
  ElementPrototype.webkitMatchesSelector ||
  ElementPrototype.mozMatchesSelector ||
  ElementPrototype.msMatchesSelector;

module.exports = function(element, selector) {
  return fn.call(element, selector);
};
