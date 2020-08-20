'use strict';

var commands = require('../commands');
var template = require('./tmpl/typeahead.hbs');

module.exports = function() {
  return {
    match: /(^)\/(\w*)$/,
    maxCount: commands.size,
    search: function(term, callback) {
      var matches = commands.getSuggestions(term);
      callback(matches);
    },
    template: function(cmd) {
      return template({
        name: cmd.command,
        description: cmd.description
      });
    },
    replace: function(cmd) {
      return '$1/' + cmd.completion;
    }
  };
};
