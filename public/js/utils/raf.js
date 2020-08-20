'use strict';

function shim(callback) {
  return window.setTimeout(callback, 1000 / 60);
}

function shimCancel(timeoutId) {
  window.clearTimeout(timeoutId);
}

let nativeRaf;
let nativeCancel;
if (typeof window !== 'undefined') {
  nativeRaf =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame;

  nativeCancel =
    window.cancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.mozCancelAnimationFrame;
}

module.exports = (nativeRaf && nativeRaf.bind(window)) || shim;
module.exports.cancel = (nativeCancel && nativeCancel.bind(window)) || shimCancel;
