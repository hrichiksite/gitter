'use strict';
const emojify = require('../../repo/emojify/emojify');
var cdn = require('gitter-web-cdn');

module.exports = (function() {
  emojify.setConfig({
    img_dir: cdn('images/emoji'),
    ignore_emoticons: true
  });

  return {
    emojify: emojify,
    named: emojify.emojiNames
  };
})();
