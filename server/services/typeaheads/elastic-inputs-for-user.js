'use strict';

module.exports = function(user) {
  var input = [user.username];
  if (user.displayName) {
    // for matching "Andy Trevorah" with "andy", "trev", or "andy t"
    var names = user.displayName.split(/\s/).filter(Boolean);
    input = input.concat(user.displayName, names);
  }

  return input;
};
