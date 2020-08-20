'use strict';

var isMobile = require('../../../utils/is-mobile');
var emoji = require('../../../utils/emoji');
var cdn = require('gitter-web-cdn');
var template = require('./tmpl/emoji-typeahead.hbs');

var SUGGESTED_EMOJI = ['smile', 'worried', '+1', '-1', 'fire', 'sparkles', 'clap', 'shipit'];

module.exports = function() {
  return {
    match: /(^|\s):([\-+\w]{2,})$/,
    maxCount: isMobile() ? 3 : 10,
    search: function(term, callback) {
      if (term.length < 1) return callback(SUGGESTED_EMOJI);

      var matches = emoji.named.filter(function(emoji) {
        return emoji.indexOf(term) === 0;
      });
      callback(matches);
    },
    template: function(emoji) {
      return template({
        emoji: emoji,
        emojiUrl: cdn('images/emoji/' + emoji + '.png')
      });
    },
    replace: function(value) {
      return '$1:' + value + ': ';
    }
  };
};
