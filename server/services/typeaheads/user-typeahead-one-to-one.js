'use strict';

var Promise = require('bluebird');
var userService = require('gitter-web-users');
var inputsForUser = require('./elastic-inputs-for-user');

module.exports = {
  query: function(text, room) {
    // not matching anything with an empty query, just like elastic
    if (!text) return Promise.resolve([]);

    var lcText = text.toLowerCase();
    var userIds = room.oneToOneUsers.map(function(obj) {
      return obj.userId;
    });

    return userService.findByIds(userIds).then(function(users) {
      return users.filter(function(user) {
        return getNames(user).some(function(name) {
          return name.indexOf(lcText) === 0;
        });
      });
    });
  }
};

function getNames(user) {
  // elastic normally does this analysis, but we're faking it
  var nonWhitespaceAlternatives = [];
  return inputsForUser(user)
    .map(function(input) {
      var lcInput = input.toLowerCase();
      var nonWhitespace = lcInput
        .split(/\s/)
        .filter(Boolean)
        .join('');
      if (lcInput !== nonWhitespace) {
        nonWhitespaceAlternatives.push(nonWhitespace);
      }
      return lcInput;
    })
    .concat(nonWhitespaceAlternatives);
}
