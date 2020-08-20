'use strict';

/* Yech */
var compact = !!navigator.userAgent.match(/(iPhone|iPod|Android|BlackBerry)/);

module.exports = function detectCompact() {
  return compact;
};
