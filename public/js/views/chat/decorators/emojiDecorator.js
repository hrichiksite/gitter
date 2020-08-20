'use strict';
const $ = require('jquery');
var emoji = require('../../../utils/emoji');

module.exports = (function() {
  var emojify = emoji.emojify;

  var decorator = {
    decorate: function(chatItemView) {
      emojify.run($(chatItemView.$el).find('.js-chat-item-text')[0]);
    }
  };

  return decorator;
})();
